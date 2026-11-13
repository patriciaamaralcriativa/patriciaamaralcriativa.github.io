"""Obtém somente cópias públicas IDC; não envia os arquivos fornecidos pelo usuário."""
import hashlib,json,sys,urllib.request
from pathlib import Path
manifest=json.loads((Path(__file__).parent/'fixtures.json').read_text());dest=Path(sys.argv[1]);dest.mkdir(parents=True,exist_ok=True)
for item in manifest['files']:
 url=item['url']
 if not url.startswith('https://storage.googleapis.com/idc-open-cr/'):raise ValueError('Origem inesperada')
 target=dest/item['file']
 if not target.exists():urllib.request.urlretrieve(url,target)
 if target.stat().st_size!=item['bytes'] or hashlib.sha256(target.read_bytes()).hexdigest()!=item['sha256']:raise ValueError('Arquivo público difere do upload auditado: '+item['file'])
 print(item['file'],'SHA256 verified',flush=True)
