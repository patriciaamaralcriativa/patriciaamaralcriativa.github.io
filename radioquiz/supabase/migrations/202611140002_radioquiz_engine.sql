-- Apply AFTER 202611140001, exclusively to the verified dedicated RADIOQUIZ project.
-- No passwords, keys or student records are included in this migration.
begin;
create schema if not exists radioquiz_private;
revoke all on schema radioquiz_private from public;
grant usage on schema radioquiz_private to authenticated;

create table radioquiz_private.teachers (
 email text primary key check (email=lower(email))
);
-- Teacher email must be provisioned privately by the project administrator after authorization.
alter table radioquiz_private.teachers enable row level security;
revoke all on radioquiz_private.teachers from public,anon,authenticated;

alter table public.radioquiz_questions
 add column points integer not null default 1000 check(points between 10 and 10000),
 add column topic text not null default '' check(length(topic)<=120),
 add column image_url text check(image_url is null or (length(image_url)<=2000 and image_url ~ '^https://'));
alter table public.radioquiz_questions add constraint four_options check(jsonb_array_length(options)=4);
alter table public.radioquiz_rooms
 add column title text not null default 'Desafio RADIOQUIZ' check(length(title) between 3 and 120),
 add column phase text not null default 'lobby' check(phase in ('lobby','question','result','finished')),
 add column quiz_ids uuid[] not null default '{}',
 add column deadline timestamptz,
 add column revision bigint not null default 0,
 add column wrong_penalty integer not null default 0 check(wrong_penalty between 0 and 10000);
alter table public.radioquiz_teams
 add column session_user_id uuid not null references auth.users(id),
 add column blocked boolean not null default false,
 add column name_key text generated always as (lower(btrim(team_name))) stored,
 add constraint team_name_normalized_unique unique(room_id,name_key),
 add constraint one_session_per_room unique(room_id,session_user_id);
create index radioquiz_team_session_idx on public.radioquiz_teams(session_user_id,room_id);
create index radioquiz_room_quiz_idx on public.radioquiz_rooms(quiz_id);
create index radioquiz_quiz_owner_idx on public.radioquiz_quizzes(owner_id);
create index radioquiz_answer_question_idx on public.radioquiz_answers(question_id);
alter table public.radioquiz_teams drop constraint radioquiz_teams_score_check;
alter table public.radioquiz_answers add column awarded_points integer not null default 0;
create table public.radioquiz_room_questions (
 room_id uuid not null references public.radioquiz_rooms(id) on delete cascade,
 position integer not null,
 question_id uuid not null references public.radioquiz_questions(id) on delete restrict,
 content jsonb not null,
 primary key(room_id,position), unique(room_id,question_id)
);
alter table public.radioquiz_room_questions enable row level security;
revoke all on public.radioquiz_room_questions from public,anon,authenticated;
create index radioquiz_room_questions_question_idx on public.radioquiz_room_questions(question_id);

-- Safe Realtime payload: no names, responses, correct options or scores.
create table public.radioquiz_signals (
 room_id uuid primary key references public.radioquiz_rooms(id) on delete cascade,
 revision bigint not null default 0
);
alter table public.radioquiz_signals enable row level security;
revoke all on public.radioquiz_signals from public,anon,authenticated;
grant select on public.radioquiz_signals to authenticated;
create table radioquiz_private.events (
 id bigint generated always as identity primary key,
 room_id uuid references public.radioquiz_rooms(id) on delete cascade,
 actor_id uuid, event_type text not null, created_at timestamptz not null default now()
);
alter table radioquiz_private.events enable row level security;
revoke all on radioquiz_private.events from public,anon,authenticated;
create index events_room_created_idx on radioquiz_private.events(room_id,created_at);

create function radioquiz_private.is_teacher() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u join radioquiz_private.teachers t on t.email=lower(u.email)
 where u.id=(select auth.uid()) and u.email_confirmed_at is not null and not u.is_anonymous)
$$;
create function radioquiz_private.can_read_signal(p_room uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select (select auth.uid()) is not null and (
 exists(select 1 from public.radioquiz_rooms r where r.id=p_room and r.owner_id=(select auth.uid()))
 or exists(select 1 from public.radioquiz_teams t where t.room_id=p_room and t.session_user_id=(select auth.uid()) and not t.blocked))
$$;
revoke all on function radioquiz_private.is_teacher() from public,anon,authenticated;
revoke all on function radioquiz_private.can_read_signal(uuid) from public,anon;
grant execute on function radioquiz_private.can_read_signal(uuid) to authenticated;
create policy room_members on public.radioquiz_signals for select to authenticated
 using ((select radioquiz_private.can_read_signal(room_id)));

create function radioquiz_private.signal(p_room uuid,p_type text) returns void
language plpgsql security definer set search_path='' as $$
begin
 update public.radioquiz_rooms set revision=revision+1 where id=p_room;
 insert into public.radioquiz_signals(room_id,revision)
 select id,revision from public.radioquiz_rooms where id=p_room
 on conflict(room_id) do update set revision=excluded.revision;
 insert into radioquiz_private.events(room_id,actor_id,event_type) values(p_room,auth.uid(),p_type);
end $$;
revoke all on function radioquiz_private.signal(uuid,text) from public,anon,authenticated;

-- Private dispatcher. Every operation checks the authenticated identity; user metadata is never trusted.
create function radioquiz_private.api(op text,p jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); teacher boolean:=radioquiz_private.is_teacher();
 r public.radioquiz_rooms; t public.radioquiz_teams; q public.radioquiz_questions;
 rid uuid; qid uuid; ids uuid[]; item jsonb; a jsonb; result jsonb; snap jsonb;
 n integer; pos integer; idx integer; elapsed integer; award integer; score integer;
 secs integer; points integer; pin text; clock timestamptz; correct boolean; projection boolean;
begin
 if uid is null then raise exception 'Entre na sua conta para continuar.' using errcode='42501'; end if;
 if p is null or jsonb_typeof(p)<>'object' then raise exception 'Dados inválidos.'; end if;
 if op='identity' then return jsonb_build_object('teacher',teacher,'user_id',uid,'server_now',clock_timestamp()); end if;
 if op in ('library','save_quiz','delete_quiz','create_room','control','history','block') and not teacher then
 raise exception 'Acesso exclusivo da professora.' using errcode='42501'; end if;
 if op='library' then
 return coalesce((select jsonb_agg(jsonb_build_object('id',z.id,'title',z.title,'subject',z.subject,
 'questions',coalesce((select jsonb_agg(to_jsonb(x) order by x.position) from public.radioquiz_questions x where x.quiz_id=z.id),'[]'::jsonb)) order by z.created_at desc)
 from public.radioquiz_quizzes z where z.owner_id=uid),'[]'::jsonb);
 elsif op='save_quiz' then
 if length(btrim(p->>'title')) not between 3 and 120 or length(btrim(p->>'subject')) not between 2 and 80
 or jsonb_typeof(p->'questions') is distinct from 'array' or jsonb_array_length(p->'questions') not between 1 and 200 then raise exception 'Revise título, disciplina e perguntas (1 a 200).'; end if;
 -- Editing creates a new version when a quiz has been used, preserving every room's history.
 qid:=nullif(p->>'id','')::uuid;
 if qid is not null and not exists(select 1 from public.radioquiz_quizzes where id=qid and owner_id=uid) then raise exception 'Questionário não encontrado.'; end if;
 if qid is not null and exists(select 1 from public.radioquiz_room_questions rq join public.radioquiz_questions x on x.id=rq.question_id where x.quiz_id=qid) then qid:=null; end if;
 if qid is null then insert into public.radioquiz_quizzes(owner_id,title,subject) values(uid,btrim(p->>'title'),btrim(p->>'subject')) returning id into qid;
 else update public.radioquiz_quizzes set title=btrim(p->>'title'),subject=btrim(p->>'subject'),updated_at=now() where id=qid;
 delete from public.radioquiz_questions where quiz_id=qid; end if;
 pos:=0;
 for item in select value from jsonb_array_elements(p->'questions') loop
 pos:=pos+1;
 if jsonb_typeof(item->'options') is distinct from 'array' or jsonb_array_length(item->'options')<>4
 or exists(select 1 from jsonb_array_elements(item->'options') v where jsonb_typeof(v)<>'string' or length(btrim(v#>>'{}')) not between 1 and 500)
 or length(btrim(item->>'prompt')) not between 5 and 1500 or item->>'answer_index' is null then raise exception 'Revise o enunciado, quatro alternativas e gabarito da pergunta %.',pos; end if;
 insert into public.radioquiz_questions(quiz_id,position,prompt,options,answer_index,explanation,time_limit_seconds,points,topic,image_url)
 values(qid,pos,btrim(item->>'prompt'),item->'options',(item->>'answer_index')::integer,coalesce(item->>'explanation',''),
 coalesce((item->>'time_limit_seconds')::integer,30),coalesce((item->>'points')::integer,1000),coalesce(item->>'topic',''),nullif(item->>'image_url',''));
 end loop;
 return jsonb_build_object('id',qid,'questions',pos);
 elsif op='delete_quiz' then
 qid:=(p->>'id')::uuid;
 if exists(select 1 from public.radioquiz_rooms where quiz_id=qid) or exists(select 1 from public.radioquiz_questions x join public.radioquiz_room_questions rq on rq.question_id=x.id where x.quiz_id=qid) then raise exception 'Este questionário faz parte do histórico e deve ser preservado.'; end if;
 delete from public.radioquiz_quizzes where id=qid and owner_id=uid;
 if not found then raise exception 'Questionário não encontrado.'; end if;
 return '{"ok":true}';
 elsif op='create_room' then
 select array_agg(value::uuid) into ids from jsonb_array_elements_text(p->'question_ids');
 if coalesce(cardinality(ids),0) not between 1 and 100 or cardinality(ids)<>(select count(distinct x) from unnest(ids) x) then raise exception 'Selecione entre 1 e 100 perguntas sem repetições.'; end if;
 if (select count(*) from public.radioquiz_questions x join public.radioquiz_quizzes z on z.id=x.quiz_id where x.id=any(ids) and z.owner_id=uid)<>cardinality(ids) then raise exception 'Seleção de perguntas inválida.'; end if;
 if (select count(*) from public.radioquiz_rooms where owner_id=uid and status<>'finished' and expires_at>now())>=5 then raise exception 'Encerre uma sala antes de abrir outra (limite 5).'; end if;
 select quiz_id into qid from public.radioquiz_questions where id=ids[1];
 -- Cryptographic PIN, collision-safe retry; never derived from the current time.
 for n in 1..20 loop
 pin:=lpad(((get_byte(extensions.gen_random_bytes(4),0)::bigint*16777216+get_byte(extensions.gen_random_bytes(4),1)::bigint*65536+get_byte(extensions.gen_random_bytes(4),2)::bigint*256+get_byte(extensions.gen_random_bytes(4),3))%900000+100000)::text,6,'0');
 begin
 insert into public.radioquiz_rooms(quiz_id,owner_id,pin_digest,title,quiz_ids,wrong_penalty)
 values(qid,uid,encode(extensions.digest(pin,'sha256'),'hex'),coalesce(nullif(btrim(p->>'title'),''),'Desafio RADIOQUIZ'),
 (select array_agg(distinct quiz_id) from public.radioquiz_questions where id=any(ids)),coalesce((p->>'wrong_penalty')::integer,0)) returning * into r;
 exit;
 exception when unique_violation then if n=20 then raise; end if; end;
 end loop;
 pos:=0;
 foreach qid in array ids loop
 pos:=pos+1;
 select * into q from public.radioquiz_questions where id=qid;
 snap:=to_jsonb(q)-'created_at';
 secs:=coalesce(nullif(p->>'time_limit_seconds','')::integer,q.time_limit_seconds);
 points:=coalesce(nullif(p->>'points','')::integer,q.points);
 if secs not between 10 and 180 or points not between 10 and 10000 then raise exception 'Tempo ou pontuação inválidos.'; end if;
 snap:=snap||jsonb_build_object('time_limit_seconds',secs,'points',points);
 insert into public.radioquiz_room_questions values(r.id,pos,qid,snap);
 end loop;
 perform radioquiz_private.signal(r.id,'room_created');
 return jsonb_build_object('room_id',r.id,'pin',pin,'questions',pos);
 elsif op='join' then
 if p->>'pin' is null or p->>'pin' !~ '^[0-9]{6}$' then raise exception 'Digite um PIN de seis números.'; end if;
 select * into r from public.radioquiz_rooms where pin_digest=encode(extensions.digest(p->>'pin','sha256'),'hex') for update;
 if not found then raise exception 'PIN não encontrado.'; end if;
 -- A known session can reconnect even after the lobby closes, but a blocked team cannot.
 select * into t from public.radioquiz_teams where room_id=r.id and session_user_id=uid;
 if found then
 if t.blocked then raise exception 'Dupla bloqueada pela professora.'; end if;
 return jsonb_build_object('room_id',r.id,'team_id',t.id); end if;
 if r.phase<>'lobby' or r.expires_at<=clock_timestamp() then raise exception 'A sala está fechada para novas duplas.'; end if;
 if (select count(*) from public.radioquiz_teams where room_id=r.id)>=60 then raise exception 'A sala atingiu o limite de 60 duplas.'; end if;
 insert into public.radioquiz_teams(room_id,team_name,member_one,member_two,session_user_id)
 values(r.id,btrim(p->>'team_name'),btrim(p->>'member_one'),btrim(p->>'member_two'),uid) returning * into t;
 perform radioquiz_private.signal(r.id,'team_joined');
 return jsonb_build_object('room_id',r.id,'team_id',t.id);
 elsif op='history' then
 return coalesce((select jsonb_agg(to_jsonb(z) order by z.created_at desc) from
 (select id,title,status,phase,current_position,created_at,finished_at,quiz_ids from public.radioquiz_rooms where owner_id=uid order by created_at desc limit 100) z),'[]'::jsonb);
 end if;

 rid:=(p->>'room_id')::uuid;
 -- Serialize answers, close, advance and removal with the same row lock.
 select * into r from public.radioquiz_rooms where id=rid for update;
 if not found then raise exception 'Sala não encontrada.'; end if;
 if r.owner_id<>uid then
 select * into t from public.radioquiz_teams where room_id=rid and session_user_id=uid;
 if not found or t.blocked then raise exception 'Sua sessão não pode acessar esta sala.' using errcode='42501'; end if;
 elsif not teacher then raise exception 'Acesso não autorizado.' using errcode='42501'; end if;
 clock:=clock_timestamp();
 if r.phase='question' and clock>=r.deadline then
 update public.radioquiz_rooms set phase='result' where id=rid returning * into r;
 perform radioquiz_private.signal(rid,'question_timeout');
 end if;
 if r.expires_at<=clock and r.phase<>'finished' then
 update public.radioquiz_rooms set phase='finished',status='finished',finished_at=clock where id=rid returning * into r;
 perform radioquiz_private.signal(rid,'room_expired'); end if;
 select content into snap from public.radioquiz_room_questions where room_id=rid and position=r.current_position;
 if op='answer' then
 if r.owner_id=uid then raise exception 'A professora não responde como dupla.'; end if;
 if r.phase<>'question' or clock>=r.deadline then return jsonb_build_object('accepted',false,'reason','Tempo encerrado.'); end if;
 if (p->>'position')::integer is distinct from r.current_position then raise exception 'A pergunta mudou. Atualize a tela.'; end if;
 idx:=(p->>'selected_index')::integer;
 if idx is null or idx not between 0 and 3 then raise exception 'Alternativa inválida.'; end if;
 if exists(select 1 from public.radioquiz_answers where team_id=t.id and question_id=(snap->>'id')::uuid) then return jsonb_build_object('accepted',false,'reason','Sua resposta já foi registrada.'); end if;
 elapsed:=greatest(0,floor(extract(epoch from(clock-r.question_started_at))*1000)::integer);
 correct:=idx=(snap->>'answer_index')::integer;
 award:=case when correct then round((snap->>'points')::integer*(0.5+0.5*greatest(0,1-elapsed::numeric/((snap->>'time_limit_seconds')::integer*1000))))::integer else -r.wrong_penalty end;
 insert into public.radioquiz_answers(room_id,team_id,question_id,selected_index,is_correct,response_ms,awarded_points)
 values(rid,t.id,(snap->>'id')::uuid,idx,correct,elapsed,award);
 -- Points are not disclosed or applied until the question closes.
 perform radioquiz_private.signal(rid,'answer_received');
 return '{"accepted":true}'::jsonb;
 elsif op in ('control','block') then
 if r.owner_id<>uid or not teacher then raise exception 'Controle exclusivo da professora.' using errcode='42501'; end if;
 if op='block' then
 update public.radioquiz_teams set blocked=coalesce((p->>'blocked')::boolean,true) where id=(p->>'team_id')::uuid and room_id=rid;
 if not found then raise exception 'Dupla não encontrada.'; end if;
 perform radioquiz_private.signal(rid,'team_block_changed'); return '{"ok":true}'; end if;
 if p->>'action'='close' then
 if r.phase<>'question' and r.phase<>'result' then raise exception 'Nenhuma pergunta aberta.'; end if;
 update public.radioquiz_rooms set phase='result' where id=rid;
 elsif p->>'action'='finish' then
 update public.radioquiz_rooms set phase='finished',status='finished',finished_at=clock where id=rid;
 elsif p->>'action'='next' then
 if r.phase not in ('lobby','result') then raise exception 'Encerre a pergunta antes de avançar.'; end if;
 pos:=r.current_position+1;
 select content into item from public.radioquiz_room_questions where room_id=rid and position=pos;
 if not found then update public.radioquiz_rooms set phase='finished',status='finished',finished_at=clock where id=rid;
 else update public.radioquiz_rooms set phase='question',status='running',current_position=pos,question_started_at=clock,
 deadline=clock+make_interval(secs=>(item->>'time_limit_seconds')::integer) where id=rid; end if;
 else raise exception 'Ação inválida.'; end if;
 perform radioquiz_private.signal(rid,'teacher_'||(p->>'action'));
 return '{"ok":true}';
 elsif op<>'state' then raise exception 'Operação desconhecida.'; end if;

 -- Scores are derived from immutable server-validated answers, limited to revealed questions.
 projection:=coalesce((p->>'projection')::boolean,false);
 result:=jsonb_build_object('room_id',rid,'title',r.title,'phase',r.phase,'position',r.current_position,
 'total',(select count(*) from public.radioquiz_room_questions where room_id=rid),
 'server_now',clock,'started_at',r.question_started_at,'deadline',r.deadline,
 'team_count',(select count(*) from public.radioquiz_teams where room_id=rid and not blocked),
 'answer_count',(select count(*) from public.radioquiz_answers where room_id=rid and question_id=(snap->>'id')::uuid),
 'question',case when snap is null then null when r.phase='question' then snap-'answer_index'-'explanation'-'quiz_id'-'id' else snap-'quiz_id'-'id' end);
 if projection then
 if r.owner_id<>uid then raise exception 'Projeção exclusiva da professora.'; end if;
 return result; end if;
 select coalesce(jsonb_agg(z order by z.rank,z.team_name),'[]'::jsonb) into a from (
 select t0.id,t0.team_name,t0.blocked,
 case when r.owner_id=uid then t0.member_one end member_one,
 case when r.owner_id=uid then t0.member_two end member_two,
 coalesce(s.score,0)::integer score,
 dense_rank() over(order by coalesce(s.score,0) desc) rank
 from public.radioquiz_teams t0 left join lateral (
 select sum(ans.awarded_points) score from public.radioquiz_answers ans
 join public.radioquiz_room_questions rq on rq.room_id=ans.room_id and rq.question_id=ans.question_id
 where ans.team_id=t0.id and (rq.position<r.current_position or r.phase in ('result','finished'))
 ) s on true where t0.room_id=rid and not t0.blocked) z;
 result:=result||jsonb_build_object('ranking',a);
 if r.owner_id=uid then
 result:=result||jsonb_build_object('teams',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'team_name',team_name,'member_one',member_one,'member_two',member_two,'blocked',blocked) order by joined_at),'[]'::jsonb) from public.radioquiz_teams where room_id=rid));
 if r.phase='finished' then result:=result||jsonb_build_object('answers',(select coalesce(jsonb_agg(to_jsonb(ans)),'[]'::jsonb) from public.radioquiz_answers ans where room_id=rid)); end if;
 else
 select to_jsonb(ans) into item from public.radioquiz_answers ans where ans.team_id=t.id and ans.question_id=(snap->>'id')::uuid;
 if r.phase='question' then item:=item-'is_correct'-'awarded_points'; end if;
 result:=result||jsonb_build_object('team_id',t.id,'team_name',t.team_name,'answer',item);
 end if;
 return result;
exception when unique_violation then raise exception 'Este nome de dupla já está em uso nesta sala.';
end $$;
revoke all on function radioquiz_private.api(text,jsonb) from public,anon;
grant execute on function radioquiz_private.api(text,jsonb) to authenticated;
-- PostgREST exposes only this invoker wrapper. Privileged code remains in an unexposed schema.
create function public.radioquiz_api(op text,p jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$ select radioquiz_private.api(op,p) $$;
revoke all on function public.radioquiz_api(text,jsonb) from public,anon;
grant execute on function public.radioquiz_api(text,jsonb) to authenticated;

-- Publishing only the safe invalidation signal avoids leaking private answers through Realtime.
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
 alter publication supabase_realtime add table public.radioquiz_signals;
 end if;
end $$;
commit;
