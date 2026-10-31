const KEY='komorebi-shiro-v1';
const initial=()=>({words:[],bond:0,fullness:65,energy:80,joy:75,memories:[{text:'しろと出会った。今日から、ふたりの暮らし。',at:Date.now()}],updatedAt:Date.now()});
let state=initial();
try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved&&Array.isArray(saved.words)&&Array.isArray(saved.memories)&&['bond','fullness','energy','joy','updatedAt'].every(k=>Number.isFinite(saved[k]))){state={...state,...saved,words:saved.words.filter(w=>w&&typeof w.text==='string'&&typeof w.category==='string').slice(0,100),memories:saved.memories.filter(m=>m&&typeof m.text==='string'&&Number.isFinite(m.at)).slice(0,30)};}}catch{}
const $=s=>document.querySelector(s);
const elapsed=Math.max(0,Math.min(24,(Date.now()-state.updatedAt)/3600000));
state.fullness=Math.max(10,state.fullness-elapsed*3);state.energy=Math.min(100,state.energy+elapsed*4);state.joy=Math.max(15,state.joy-elapsed*2);
let sound=false,audio,animationTimer,lastPet=0;
const clamp=n=>Math.max(0,Math.min(100,n));
function save(){state.updatedAt=Date.now();try{localStorage.setItem(KEY,JSON.stringify(state));$('#save-state').textContent='● おもいでは自動保存';}catch{$('#save-state').textContent='保存できません（この画面では遊べます）';}}
function render(){
 const stats=[['ごきげん',state.joy,'いい感じ'],['おなか',state.fullness,'満足'],['げんき',state.energy,'元気いっぱい']];
 $('#stats').replaceChildren(...stats.map(([name,value,label])=>{const row=document.createElement('div');row.className='stat';const line=document.createElement('div');line.className='stat-label';const title=document.createElement('span');title.textContent=name;const status=document.createElement('span');status.textContent=Math.round(value)+' / 100';line.append(title,status);const bar=document.createElement('div');bar.className='bar';bar.setAttribute('role','meter');bar.setAttribute('aria-label',name);bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax','100');bar.setAttribute('aria-valuenow',Math.round(value));const fill=document.createElement('div');fill.style.width=clamp(value)+'%';bar.append(fill);row.append(line,bar);return row;}));
 $('#friendship').textContent='♡ なかよし Lv.'+(1+Math.floor(state.bond/20));
 $('#mood').textContent=state.fullness<30?'おなかが、くうっと鳴っている。':state.energy<25?'少し休みながら、お話したいみたい。':state.joy>85?'きみといっしょで、とってもうれしそう！':'きみに会えて、うれしいみたい。';
 $('#word-count').textContent=state.words.length+' こ';
 $('#word-tags').replaceChildren(...(state.words.length?state.words.slice(-12).map(w=>{const tag=document.createElement('span');tag.className='word-tag';tag.textContent=w.text;tag.title=[w.category,w.preference,w.relation?`${w.relation.word}：${w.relation.answer}`:null].filter(Boolean).join(' / ');return tag;}):[Object.assign(document.createElement('span'),{className:'empty-words',textContent:'まだ空っぽのたからばこ。\n最初のことばを教えてね。'})]));
 $('#memories').replaceChildren(...state.memories.slice(0,4).map(m=>{const row=document.createElement('div');row.className='memory';const time=document.createElement('time');time.dateTime=new Date(m.at).toISOString();time.textContent=new Date(m.at).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'});const icon=document.createElement('span');icon.textContent='✧';const content=document.createElement('div');const p=document.createElement('p');p.textContent=m.text;const date=document.createElement('small');date.textContent=new Date(m.at).toLocaleDateString('ja-JP',{month:'long',day:'numeric'});content.append(p,date);row.append(time,icon,content);return row;}));
}
function say(text,reaction='talk'){
 $('#speech').replaceChildren(document.createTextNode(text),document.createElement('span'));
 const cat=$('#cat');
 clearTimeout(animationTimer);
 cat.classList.remove('happy');cat.removeAttribute('data-reaction');
 void cat.offsetWidth;
 cat.dataset.reaction=reaction;cat.classList.add('happy');
 animationTimer=setTimeout(()=>{cat.classList.remove('happy');cat.removeAttribute('data-reaction');},reaction==='rest'?4200:2600);
 chime();
}
function chime(){if(!sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.setValueAtTime(660,audio.currentTime);osc.frequency.exponentialRampToValueAtTime(880,audio.currentTime+.14);gain.gain.setValueAtTime(.04,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.35);osc.connect(gain).connect(audio.destination);osc.start();osc.stop(audio.currentTime+.35);}catch{sound=false;updateSound();}}
function memory(text){state.memories.unshift({text,at:Date.now()});state.memories=state.memories.slice(0,30);}
function finish(){save();render();}
let pendingWord=null;
let teachingStage='entry';
function resetTeaching(){
 pendingWord=null;teachingStage='entry';
 $('#teach-form').reset();$('#form-message').textContent='';
 $('#teach-entry').hidden=false;$('#teach-entry').disabled=false;
 $('#teach-question').hidden=true;$('#answer-choices').replaceChildren();
 $('#teach-title').textContent='新しいことば、教えて。';
 $('#teach-description').textContent='ふたつ質問してから、きみのことばを覚えるよ。';
}
function teach(){resetTeaching();$('#teach-dialog').showModal();$('#word').focus();}
function askTeachingQuestion(){
 const first=teachingStage==='preference';
 const question=first?'それって好き？':`それって「${pendingWord.relation.word}」と関係ある？`;
 $('#teach-entry').hidden=true;$('#teach-entry').disabled=true;
 $('#teach-question').hidden=false;
 $('#teach-title').textContent=`「${pendingWord.text}」のこと、もっと知りたいな。`;
 $('#teach-description').textContent=first?'まずは、きみの気持ちを教えて。':'なるほど！もうひとつ聞いてもいい？';
 $('#question-progress').textContent=first?'しつもん 1 / 2':'しつもん 2 / 2';
 $('#question-text').textContent=question;
 $('#answer-choices').replaceChildren(...(first?['大好き','好き','ふつう','嫌い']:['関係ある','関係ない','わからない']).map(answer=>{
  const button=document.createElement('button');button.type='button';button.textContent=answer;
  button.addEventListener('click',()=>answerTeachingQuestion(answer));return button;
 }));
 say(question);$('#question-text').focus();
}
function answerTeachingQuestion(answer){
 if(!pendingWord)return;
 if(teachingStage==='preference'){
  if(!['大好き','好き','ふつう','嫌い'].includes(answer))return;
  pendingWord.preference=answer;teachingStage='relation';askTeachingQuestion();return;
 }
 if(teachingStage!=='relation'||!['関係ある','関係ない','わからない'].includes(answer))return;
 pendingWord.relation.answer=answer;
 const learned=pendingWord;
 state.words.push(learned);state.bond+=4;state.joy=clamp(state.joy+10);
 memory(`「${learned.text}」を覚えた。きみの気持ちは「${learned.preference}」。「${learned.relation.word}」との関係は「${answer}」。`);
 $('#teach-dialog').close();resetTeaching();
 const feeling=learned.preference==='嫌い'?'苦手なんだね。無理しなくていいよ。':`「${learned.preference}」なんだね。`;
 say(`「${learned.text}」、覚えたよ！${feeling}教えてくれてありがとう。`,'learn');finish();
}
let lastTalk=-1;
function talk(){const word=state.words.length?state.words[Math.floor(Math.random()*state.words.length)]:null;let lines=['雲って、おひるねしてるとき、どんな夢を見るのかな。','きみといると、なんでもない日も、特別になるね。','ぼくね、きみの「ただいま」がいちばん好き。','今日はひなたのにおいがするね。いっしょに、のんびりしよう。'];if(word){const templates={'食べもの':`「${word.text}」って、きみと半分こしたら、もっとおいしいのかな？`,'場所':`いつか「${word.text}」に行ってみたいな。きみも、いっしょに来てくれる？`,'遊び':`今日は「${word.text}」の気分！きみに教えてもらって、好きになったんだ。`,'好きなもの':`「${word.text}」のこと、また考えてたよ。きみの好きなもの、ぼくも好き。`};if(['大好き','好き','ふつう','嫌い'].includes(word.preference)){
 const feeling=word.preference==='嫌い'?`「${word.text}」は苦手なんだよね。ちゃんと覚えてるよ。`:`「${word.text}」のこと、きみは「${word.preference}」って教えてくれたね。`;
 const relation=word.relation;
 const connection=relation?relation.answer==='関係ある'?`「${relation.word}」と関係あるんだね。`:relation.answer==='関係ない'?`「${relation.word}」とは関係ないんだね。`:`「${relation.word}」との関係は、まだわからないんだったね。`:'';
 lines.push(feeling+connection);
 }else{lines.push(templates[word.category]||`「${word.text}」、ちゃんと覚えてるよ。もっと教えてね。`);}}const choices=lines.map((_,index)=>index).filter(index=>index!==lastTalk);const index=choices[Math.floor(Math.random()*choices.length)];lastTalk=index;say(lines[index]);state.joy=clamp(state.joy+4);state.bond++;finish();}
function feed(){if(state.fullness>=95){say('おなか、ぽんぽこりん！おやつは、またあとで食べよう。');return;}state.fullness=clamp(state.fullness+25);state.joy=clamp(state.joy+8);state.bond+=2;say('さくさく、もぐもぐ……。きみと食べるおやつ、だいすき！','feed');memory('ふたりでおやつ。しろは、最後のひとかけらまで大切に食べた。');finish();}
function play(){if(state.energy<20){state.energy=clamp(state.energy+30);say('ちょっとひと休み。いっしょに深呼吸……すぅ、はぁ。元気、戻ってきたよ。','rest');memory('しろとひと休み。窓から入る風が、やさしかった。');}else{state.energy=clamp(state.energy-18);state.fullness=clamp(state.fullness-8);state.joy=clamp(state.joy+18);state.bond+=3;const events=[['お庭で、四つ葉を見つけたよ！きみにあげる。ずっと仲良しでいようね。','お庭で四つ葉のクローバーを見つけた。しろからの、小さな贈りもの。'],['紙ひこうき、とんだ！わあ、きみのところまで飛んだよ！','紙ひこうきを飛ばした。しろのひこうきは、あなたの足元に着地した。'],['しゃぼん玉に、お空が映ってる！小さなお空、つかまえたいな。','しゃぼん玉を追いかけた。しろの鼻にひとつ、ぱちん。']];const event=events[Math.floor(Math.random()*events.length)];say(event[0],'play');memory(event[1]);}finish();}
$('#cat').addEventListener('click',()=>{say('えへへ。きみの手、あったかいね。もうちょっと、なでて。','pet');if(Date.now()-lastPet>2000){state.joy=clamp(state.joy+6);state.bond++;lastPet=Date.now();finish();}});
document.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>({talk,teach,feed,play})[button.dataset.action]()));
$('#open-teach').addEventListener('click',teach);$('#close-dialog').addEventListener('click',()=>$('#teach-dialog').close());$('#teach-dialog').addEventListener('click',e=>{if(e.target===$('#teach-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('#teach-dialog').addEventListener('close',()=>{if(pendingWord)say('続きは、また教えてね。まだ覚えていないから、いつでも最初からお話しできるよ。');resetTeaching();});
$('#teach-form').addEventListener('submit',e=>{
 e.preventDefault();if(teachingStage!=='entry')return;
 const text=$('#word').value.trim(),category=$('#category').value;
 if(!text){$('#form-message').textContent='ことばを入れてね。';return;}
 if(state.words.some(w=>w.text===text)){$('#form-message').textContent='そのことばは、もう覚えてるよ！';return;}
 if(state.words.length>=100){$('#form-message').textContent='たからばこが100こでいっぱいになったよ。';return;}
 const topics={'食べもの':'おやつ','場所':'おでかけ','遊び':'ともだち','好きなもの':'楽しいこと'};
 const related=state.words.findLast(w=>w.category===category&&w.text!==text);
 let topic=related?.text||topics[category]||'毎日の暮らし';
 if(topic===text)topic='毎日の暮らし';
 pendingWord={text,category,relation:{word:topic}};
 teachingStage='preference';askTeachingQuestion();
});
function updateSound(){$('#sound').textContent='♫ 音 '+(sound?'ON':'OFF');$('#sound').setAttribute('aria-pressed',String(sound));}
$('#sound').addEventListener('click',()=>{sound=!sound;updateSound();chime();});
$('#date').textContent=new Date().toLocaleDateString('ja-JP',{month:'long',day:'numeric',weekday:'long'});
finish();
