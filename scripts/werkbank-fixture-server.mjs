/** Local UI-only fixture proxy. Never forwards workspace mutations to real APIs.
 * Start manually: node scripts/werkbank-fixture-server.mjs
 * Uses existing local authentication for server-rendered /workspace access.
 */
import http from 'node:http';
const today = new Date().toISOString().slice(0,10);
const now = new Date().toISOString();
let seq=10, activeSession=null;
const entries=[{id:'fixture-entry',project:'Design',task:'Review the ledger',date:today,start:'08:00',end:'09:30',createdAt:now}];
let todos=[{id:'fixture-task',text:'Review workbench',project:'Design',done:false,pinned:false,dueDate:today,notes:'A local fixture only.',sortOrder:0,createdAt:now,doneAt:null,subtasks:[{id:'fixture-subtask',text:'Check keyboard access',done:false,sortOrder:0}]},{id:'fixture-task-2',text:'Plan next session',project:'Design',done:false,pinned:false,dueDate:null,notes:'',sortOrder:1,createdAt:now,doneAt:null,subtasks:[]}];
const route={id:'fixture-route',name:'River loop',kind:'home',reason:'A quiet local fixture route.',reward:'River views',compromise:'Shared paths',distanceKm:42,elevationGainM:240,rideMinutes:100,ftpWatts:260,surface:{pavedPercent:100,unpavedPercent:0,unknownPercent:0,stressfulKm:0,quietKm:42},routeQuality:{removedBranchCount:0,removedBacktrackKm:0},coordinates:[[15.43,47.07,350],[15.44,47.08,370],[15.45,47.07,350],[15.43,47.07,350]],generatedAt:now,router:'Local fixture',review:'Fixture'};
let routeState={routeId:route.id,saved:false,ridden:false,rating:null,traffic:null,note:''};
const movie={key:'fixture-film',title:'A quiet evening',url:'https://example.com',imageUrl:'/fofo-logo.png',screenings:[{id:'fixture-screening',startsAt:today+'T19:00:00+02:00',date:today,time:'19:00',venueId:'schubert-kino',venue:'Schubert Kino',versionCode:'OV',versionLabel:'Original version',cinemaUrl:null,calendarUrl:null}]};
let movieState=null;
const transactions=[{id:'income',bookedOn:today,merchant:'Salary',description:'Fixture income',amountCents:300000,currency:'EUR',category:'Income',provider:'bank'},{id:'housing',bookedOn:today,merchant:'Rent',description:'Fixture rent',amountCents:-80000,currency:'EUR',category:'Housing',provider:'bank'},{id:'food',bookedOn:today,merchant:'Market',description:'Fixture food',amountCents:-5000,currency:'EUR',category:'Groceries',provider:'bank'}];
let expenses=[{id:'fixture-expense',name:'Rent plan',amountCents:80000,category:'Housing',dueDay:1,active:true,note:''}];
let subscriptions=[{id:'fixture-subscription',name:'Music',amountCents:999,cadence:'monthly',lastChargeOn:today,nextChargeOn:today,status:'active',confidence:'high',occurrences:6,category:'Subscriptions'}];
let failNext=false;
const json=(res,value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost:3110');
 if(url.pathname==='/__fixture/fail-next'){failNext=true;return json(res,{ok:true});}
 if(url.pathname.startsWith('/api/workspace/')){
  let body='';for await(const chunk of req)body+=chunk;
  const data=body?JSON.parse(body):{};const path=url.pathname.replace('/api/workspace/','');const method=req.method;
  if(failNext){failNext=false;return json(res,{error:'Fixture failure. Please try again.'},503);}
  await new Promise(resolve=>setTimeout(resolve,150));
  if(path==='time-entries'){
   if(method==='GET')return json(res,{entries,activeSession});
   const entry={...data,id:'fixture-'+seq++,createdAt:now};entries.push(entry);return json(res,{entry});
  }
  if(path.startsWith('time-entries/')){const id=path.split('/')[1];const i=entries.findIndex(e=>e.id===id);if(method==='DELETE'){entries.splice(i,1);return json(res,{ok:true});}entries[i]={...entries[i],...data};return json(res,{entry:entries[i]});}
  if(path==='active-session'){
   if(method==='POST'){activeSession={...data,id:'fixture-session',startedAt:new Date(Date.now()-120000).toISOString()};return json(res,{activeSession});}
   const entry={id:'saved-timer-'+seq++,project:activeSession.project,task:activeSession.task,date:today,start:'10:00',end:'10:02',createdAt:now};entries.push(entry);activeSession=null;return json(res,{entry,activeSessionId:'fixture-session'});
  }
  if(path==='todos'){
   if(method==='GET')return json(res,{todos});
   if(method==='POST'){const todo={...todos[0],...data,id:'fixture-task-'+seq++,createdAt:now,subtasks:[]};todos.unshift(todo);return json(res,{todo});}
   if(method==='PUT'){todos=data.order.map((id,i)=>({...todos.find(t=>t.id===id),sortOrder:i}));return json(res,{ok:true});}
   todos=todos.filter(t=>!t.done);return json(res,{ok:true});
  }
  if(path.startsWith('todos/')){const [,id,sub,sid]=path.split('/');const todo=todos.find(t=>t.id===id);if(sub){if(method==='POST'){const item={id:'sub-'+seq++,text:data.text,done:false,sortOrder:todo.subtasks.length};todo.subtasks.push(item);return json(res,{subtask:item});}if(method==='DELETE'){todo.subtasks=todo.subtasks.filter(s=>s.id!==sid);return json(res,{ok:true});}const item=todo.subtasks.find(s=>s.id===sid);Object.assign(item,data);return json(res,{subtask:item});}if(method==='DELETE'){todos=todos.filter(t=>t.id!==id);return json(res,{ok:true});}Object.assign(todo,data);if('done'in data)todo.doneAt=data.done?now:null;return json(res,{todo});}
  if(path==='finance')return json(res,{transactions,subscriptions,monthlyExpenses:expenses,meta:{dataStart:today,dataEnd:today,transactionCount:transactions.length}});
  if(path.startsWith('finance/subscriptions/')){const item=subscriptions.find(s=>s.id===path.split('/')[2]);Object.assign(item,data);return json(res,{subscription:item});}
  if(path.startsWith('finance/expenses')){const id=path.split('/')[2];if(method==='DELETE'){expenses=expenses.filter(e=>e.id!==id);return json(res,{ok:true});}let expense=expenses.find(e=>e.id===id);if(!expense){expense={id:'expense-'+seq++};expenses.push(expense);}Object.assign(expense,data);return json(res,{expense});}
  if(path==='routes')return json(res,{routes:[route],states:[routeState],homeLabel:'Local fixture'});
  if(path==='routes/heatmap')return json(res,{polylines:[]});
  if(path.endsWith('/gpx')){res.writeHead(200,{'Content-Type':'application/gpx+xml','Content-Disposition':'attachment; filename="fixture-route.gpx"'});return res.end('<?xml version="1.0"?><gpx version="1.1"><trk><name>Fixture</name><trkseg><trkpt lat="47.07" lon="15.43"/></trkseg></trk></gpx>');}
  if(path.startsWith('routes/')){routeState={...routeState,...data};return json(res,{state:routeState});}
  if(path==='movies')return json(res,{movies:[movie],states:movieState?[movieState]:[],refreshedAt:now});
  if(path==='movies/upcoming')return json(res,{releases:[{key:'fixture-upcoming',title:'Next evening',releaseDate:today,imageUrl:'/fofo-logo.png',detailsUrl:'https://example.com'}],states:[],refreshedAt:now,sourceUrl:'https://example.com'});
  if(path.startsWith('movies/')){if(method==='PATCH'){movieState=data.state?{movieKey:path.split('/')[1],...data}:null;return json(res,{state:movieState});}return json(res,{director:'Fixture Director',cast:[],year:2026,runtimeMinutes:90,originalLanguage:'English',synopsis:'Local UI fixture. No live integration claim.',screenings:movie.screenings,title:'Next evening',genre:'Drama',country:'Austria',posterUrl:'/fofo-logo.png',detailsUrl:'https://example.com'});}
  return json(res,{error:'Unhandled fixture endpoint'},404);
 }
 if(!["GET","HEAD"].includes(req.method)) return json(res,{error:"Fixture proxy blocks all other mutations."},403);
 // Only read traffic reaches the original local app. Mutations above never do.
 const upstream=http.request({hostname:'localhost',port:3100,path:req.url,method:req.method,headers:{...req.headers,host:'localhost:3100'}},response=>{res.writeHead(response.statusCode,response.headers);response.pipe(res);});
 upstream.on('error',()=>{res.writeHead(502);res.end('Local application unavailable');});req.pipe(upstream);
});
server.listen(3110,'127.0.0.1',()=>console.log('UI fixtures: http://localhost:3110/workspace — workspace API writes remain in memory'));
