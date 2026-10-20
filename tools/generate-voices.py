"""Build fixed project dialogue MP3s. Runtime playback never calls a TTS service.
Install edge-tts 7.3.1 only for rebuilding; run from the project root.
"""
import asyncio, json, re, sys
from pathlib import Path
import edge_tts

BASE = Path(__file__).resolve().parent.parent
OUT = BASE / 'assets/media/voice'
PROFILES = {'nostalgia': ('-7%', '-1Hz'), 'thinking': ('-3%', '+0Hz'), 'research': ('-2%', '+0Hz'),
            'curious': ('+1%', '+2Hz'), 'expecting': ('+1%', '+2Hz'), 'success': ('+2%', '+2Hz'),
            'happy': ('+3%', '+2Hz'), 'encourage': ('+0%', '+1Hz'), 'warm': ('-2%', '+1Hz')}

def spoken(text):
    text = re.sub(r'\b([1-6])G\b', lambda m: '一二三四五六'[int(m[1])-1]+'代移动通信', text, flags=re.I)
    text = re.sub(r'\bAI\b', '人工智能', text, flags=re.I)
    text = re.sub(r'\bWi-Fi\b', '无线网络', text, flags=re.I)
    return re.sub(r'\b[A-Z]{2,5}\b', lambda m: ' '.join(m[0]), text)

async def main():
    lines = json.loads((OUT/'lines.json').read_text(encoding='utf-8'))
    limit = asyncio.Semaphore(4)
    completed = 0
    errors = []
    async def build(entry):
        nonlocal completed
        target = OUT / entry['file']
        if target.exists() and target.stat().st_size > 500:
            completed += 1
            return
        async with limit:
            for attempt in range(3):
                try:
                    rate, pitch = PROFILES.get(entry['emotion'], PROFILES['warm'])
                    if entry['text'].startswith('你好，我是澜。咦'): rate, pitch = '-2%', '+2Hz'
                    temporary = target.with_suffix('.mp3.part')
                    await asyncio.wait_for(edge_tts.Communicate(spoken(entry['text']), 'zh-CN-XiaoxiaoNeural', rate=rate, pitch=pitch).save(str(temporary)), timeout=65)
                    if temporary.stat().st_size < 500: raise RuntimeError('Empty audio output')
                    temporary.replace(target)
                    completed += 1
                    if completed % 30 == 0: print(f'{completed}/{len(lines)} built', flush=True)
                    return
                except Exception as error:
                    if attempt == 2: errors.append({'text':entry['text'],'error':str(error)})
                    else: await asyncio.sleep(2+attempt*3)
    await asyncio.gather(*(build(entry) for entry in lines))
    if errors:
        (OUT/'build-errors.json').write_text(json.dumps(errors,ensure_ascii=False,indent=2),encoding='utf-8')
        print(f'Failed {len(errors)} lines',flush=True)
        sys.exit(1)
    catalog = {entry['text']:'assets/media/voice/'+entry['file'] for entry in lines}
    (BASE/'assets/js/lan-voice-catalog.js').write_text('/* Fixed project dialogue, Xiaoxiao neural voice. */\nwindow.LanVoiceCatalog = '+json.dumps(catalog,ensure_ascii=False)+';\n',encoding='utf-8')
    print(f'Complete: {len(lines)} files, {sum((OUT/e["file"]).stat().st_size for e in lines)} bytes',flush=True)

asyncio.run(main())
