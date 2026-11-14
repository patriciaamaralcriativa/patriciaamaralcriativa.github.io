-- Server-only smoke test. Execute as administrator, exclusively in the dedicated RADIOQUIZ project.
-- All synthetic users, allowlist entries and game records are rolled back.
-- This is NOT a login, HTTP, WebSocket or multi-device test.
begin;
insert into auth.users(id,email,email_confirmed_at,is_anonymous) values
 ('10000000-0000-0000-0000-000000000001','radioquiz-smoke@example.invalid',now(),false),
 ('20000000-0000-0000-0000-000000000001',null,null,true),
 ('20000000-0000-0000-0000-000000000002',null,null,true),
 ('20000000-0000-0000-0000-000000000003',null,null,true);
insert into radioquiz_private.teachers(email)values('radioquiz-smoke@example.invalid');
set local role authenticated;
do $$
declare
 z jsonb; room jsonb; s jsonb; ids jsonb; idx integer; rejected boolean; teacher text:='10000000-0000-0000-0000-000000000001';
begin
 perform set_config('request.jwt.claim.sub',teacher,true);
 z:=public.radioquiz_api('identity');
 if not (z->>'teacher')::boolean then raise exception 'Teacher authorization failed'; end if;
 z:=public.radioquiz_api('save_quiz','{"title":"Smoke test RADIOQUIZ","subject":"Validação","questions":[{"prompt":"Qual é a alternativa de teste?","options":["A","B","C","D"],"answer_index":0,"explanation":"Registro sintético de teste.","time_limit_seconds":30,"points":1000}]}'::jsonb);
 z:=public.radioquiz_api('library');
 select jsonb_agg(x->'id') into ids from jsonb_array_elements(z->0->'questions') x;
 room:=public.radioquiz_api('create_room',jsonb_build_object('title','Teste temporário','question_ids',ids));
 if room->>'pin' !~ '^[0-9]{6}$' then raise exception 'Invalid PIN'; end if;
 for idx in 1..3 loop
 perform set_config('request.jwt.claim.sub','20000000-0000-0000-0000-'||lpad(idx::text,12,'0'),true);
 z:=public.radioquiz_api('join',jsonb_build_object('pin',room->>'pin','team_name','Teste '||idx,'member_one','Integrante A','member_two','Integrante B'));
 end loop;
 rejected:=false;
 begin perform public.radioquiz_api('library');exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Student accessed quiz library'; end if;
 perform set_config('request.jwt.claim.sub',teacher,true);
 perform public.radioquiz_api('control',jsonb_build_object('room_id',room->>'room_id','action','next'));
 for idx in 1..3 loop
 perform set_config('request.jwt.claim.sub','20000000-0000-0000-0000-'||lpad(idx::text,12,'0'),true);
 s:=public.radioquiz_api('state',jsonb_build_object('room_id',room->>'room_id'));
 if s->>'phase'<>'question' or s->'question' ? 'answer_index' then raise exception 'State/gabarito isolation failed'; end if;
 z:=public.radioquiz_api('answer',jsonb_build_object('room_id',room->>'room_id','position',1,'selected_index',idx-1));
 if not (z->>'accepted')::boolean then raise exception 'Answer failed'; end if;
 z:=public.radioquiz_api('answer',jsonb_build_object('room_id',room->>'room_id','position',1,'selected_index',idx-1));
 if (z->>'accepted')::boolean then raise exception 'Duplicate answer accepted'; end if;
 end loop;
 perform set_config('request.jwt.claim.sub',teacher,true);
 perform public.radioquiz_api('control',jsonb_build_object('room_id',room->>'room_id','action','close'));
 s:=public.radioquiz_api('state',jsonb_build_object('room_id',room->>'room_id'));
 if (s->>'answer_count')::integer<>3 or (s->'ranking'->0->>'score')::integer<500 then raise exception 'Score/answer count failed'; end if;
 s:=public.radioquiz_api('state',jsonb_build_object('room_id',room->>'room_id','projection',true));
 if s ? 'ranking' or s ? 'teams' then raise exception 'Projection leaked ranking'; end if;
 perform public.radioquiz_api('control',jsonb_build_object('room_id',room->>'room_id','action','next'));
 s:=public.radioquiz_api('state',jsonb_build_object('room_id',room->>'room_id'));
 if s->>'phase'<>'finished' or jsonb_array_length(s->'answers')<>3 then raise exception 'Finish/history failed'; end if;
end $$;
reset role;
rollback;
select 'PASS: remote SQL smoke test completed; all synthetic records rolled back' as result;
