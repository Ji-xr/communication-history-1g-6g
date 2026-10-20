# 澜的自然人声

默认声线：`zh-CN-XiaoxiaoNeural`，中文女声。用户已试听并选定此声线。

本目录包含 441 段预先生成的固定项目对白和交互反馈音频。网页通过本地 MP3 播放，无需在线合成、API 密钥或 Python。声线选择中的系统中文朗读保留为手动备用；未收录的动态句子会保留字幕和明确提示，不会自动换成机械系统声线。字幕与剧情进度不受音频播放状态影响。

自然对话按对白原有情绪分别制作节奏；安静讲述模式适当放缓播放。请通过“人声设置与试听”调整。新增或修改字幕后需要重建对应音频。

重建环境：Python，`tools/voice-requirements.txt` 中的 edge-tts 7.3.1。生成时使用 Microsoft Edge 在线语音服务；浏览时只读取已经附带的音频。生成工具：[edge-tts 项目及用法](https://github.com/rany2/edge-tts)。这里的音频为合成角色人声。

在项目根目录执行：

```powershell
node tools/collect-voice-lines.cjs
python -m pip install -r tools/voice-requirements.txt
python tools/generate-voices.py
node --test tests/voice-assets.test.js tests/lan-voice.test.js
```

`lines.json` 保存字幕、情绪和文件名；`assets/js/lan-voice-catalog.js` 将字幕映射到文件。文件名根据字幕 SHA-256 前 20 位生成。重新生成会跳过已经存在的非空文件；若修改了声线或情绪，应先将旧音频目录移到备份位置，再重建。请不要只替换 MP3 而漏掉索引。
