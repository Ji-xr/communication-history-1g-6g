/* Limits count visible characters, never UTF-16 halves. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.CommsText=api;})(typeof window==='object'?window:null,function(){
 'use strict';
 const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter('zh-CN',{granularity:'grapheme'}):null;
 function characters(value){const text=Array.from(String(value??'')).filter(char=>!(char.length===1&&/[\uD800-\uDFFF]/u.test(char))).join('');return segmenter?Array.from(segmenter.segment(text),part=>part.segment):Array.from(text);}
 const limit=(value,size)=>characters(value).slice(0,size).join('');
 const dropLast=value=>characters(value).slice(0,-1).join('');
 const length=value=>characters(value).length;
 return {characters,limit,dropLast,length};
});
