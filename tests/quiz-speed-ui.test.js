const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const app = fs.readFileSync('app.js', 'utf8');

test('答题选择立即判定并用状态类标记正误', () => {
  assert.match(app, /function selectQuizOption\(index\)\{[^}]*submitQuizAnswer\(index\)/);
  assert.match(app, /quiz-correct/);
  assert.match(app, /quiz-wrong/);
  assert.match(app, /function submitQuizAnswer[\s\S]*?recordAnswer\(quizSession,index\)/);
});

test('默认约一秒自动切题，主动看答案会暂停并显示继续按钮', () => {
  assert.match(app, /setTimeout\(\(\)=>\{if\(quizSession\?\.feedback&&!quizSession\.completed&&!quizSession\.showAnswer\)nextQuizQuestion\(\)\},1000\)/);
  assert.match(app, /function revealQuizAnswer\(\)[\s\S]*?clearTimeout\(quizAutoTimer\)[\s\S]*?showAnswer=true/);
  assert.match(app, /onclick="nextQuizQuestion\(\)">下一题/);
  assert.match(app, /查看每题正确答案与解析/);
  assert.match(app, /quizSession\.completed[\s\S]*?得分/);
});

