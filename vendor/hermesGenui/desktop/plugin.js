import{host as wr,TRANSCRIPT_DIRECTIVE_AREA as ub}from"@hermes/plugin-sdk";import{createContext as bl}from"react";var Nr=["mail","rupee","bell","cal","check","clock","chart","photo","spark","chat","brain","sun","moon","sunset","note","globe","search","heart","plane","bed","food","walk","pin","trophy","lock","star","leaf","flame","ticket","info","alert"];function M(e){if(typeof e==="number"&&isFinite(e))return e;return null}function A(e,t=120){if(typeof e!=="string")return;let n=e.trim();if(!n)return;return n.slice(0,t)}function f(e,t=120){for(let n of e){let r=A(n,t);if(r!==void 0)return r}return}function wn(e,t){if(e.length<=t)return e;let n=e.slice(0,t-1),r=n.search(/\s\S*$/);return`${(r>t/2?n.slice(0,r):n).replace(/[\s,;:.–—-]+$/,"")}…`}function pe(e,t=120){let n=f(e,1/0);return n===void 0?void 0:wn(n,t)}function I(e){return e.find((t)=>Array.isArray(t))}function Re(e){if(Nr.includes(e))return e;return}function Pe(e){if(typeof e==="string"&&/^[a-z][a-z0-9_-]{0,23}$/.test(e))return e;return}function G(e){if(typeof e==="string"&&/^https:\/\//.test(e))return e;return}function w(e){return Object.fromEntries(Object.entries(e).filter(([,t])=>t!==void 0))}class Pt{path;dropped;constructor(e="",t=[]){this.path=e,this.dropped=t}at(e){let t=this.path?`${this.path}.${e}`:String(e);return new Pt(t,this.dropped)}drop(e){return this.dropped.push({path:this.path,why:e}),null}}function B(e,t,n,r){if(e.length>t)n.drop(`kept the first ${t} ${r} of ${e.length}`);return e.slice(0,t)}function ge(e,t=120){if(M(e)!==null)return String(e);return A(e,t)}function Oe(e,t=120){for(let n of e){let r=ge(n,t);if(r!==void 0)return r}return}var hl=/@\w[\w-]*:|@(?:diff|staged)\b/,Xe="a button's message can't start with / @ or ! or carry @-references";function te(e){if(typeof e!=="string")return!1;let t=e.trim();return/^[/@!]/.test(t)||hl.test(t)}var _=bl({send:()=>{},fill:()=>{}}),fl=120;function Nn(e){let t=async(r)=>{await e?.insertText(null,r,{mode:"block"})},n=(r)=>{t(r).then(()=>e?.focus(null)).catch(()=>{})};return{send(r){if(r.length>fl||te(r)){n(r);return}try{if(e?.submit(null,r))return;t(r).catch(()=>{})}catch{t(r).catch(()=>{})}},fill:n}}import{useContext as kh,useEffect as vh,useState as wh}from"react";import{createContext as ml,useCallback as gl,useContext as Cr,useMemo as xl,useState as yl}from"react";import{jsx as kl}from"react/jsx-runtime";var Cn=ml({walks:new Map,setWalk:()=>{}});function Sr({children:e}){let[t,n]=yl(()=>new Map),r=gl((a,i)=>{n((s)=>{let l=s.get(a);if(l===i||l&&i&&l.steps===i.steps&&l.at===i.at&&l.from===i.from)return s;let c=new Map(s);if(i===void 0)c.delete(a);else c.set(a,i);return c})},[]),o=xl(()=>({walks:t,setWalk:r}),[t,r]);return kl(Cn.Provider,{value:o,children:e})}function Tr(e){let{walks:t}=Cr(Cn);return e===void 0?void 0:t.get(e)}function Mr(){return Cr(Cn).setWalk}import{useContext as Br}from"react";import{jsx as wl}from"react/jsx-runtime";var vl={mail:'<path d="M4 6h16v12H4z"/><path d="m4 7 8 6 8-6"/>',rupee:'<path d="M7 5h10M7 9h10M13 19 8 13h2a4 4 0 0 0 0-8"/>',bell:'<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',cal:'<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16"/>',check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',clock:'<circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 2"/>',search:'<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4"/>',note:'<path d="M6 4h9l4 4v12H6z"/><path d="M14 4v5h5M9 13h7M9 17h5"/>',globe:'<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5z"/>',chart:'<path d="M4 19h16"/><path d="m5 15 4-5 4 3 6-7"/>',photo:'<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17 5-4 4 3 3-2 4 3"/>',spark:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',chat:'<path d="M20 12a8 8 0 0 1-11.5 7.2L4 20l1-4.2A8 8 0 1 1 20 12z"/>',brain:'<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3V4zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3V4z"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',moon:'<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>',sunset:'<path d="M4 18h16M7 14a5 5 0 0 1 10 0M12 4v3M4.9 8.9l1.4 1.4M19.1 8.9l-1.4 1.4"/>',heart:'<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',plane:'<path d="M10.5 13.5 3 11l1.5-1.5 7.5 1L16 6.5a2 2 0 0 1 3 3L15 13.5l1 7.5L14.5 22.5 12 15z"/>',bed:'<path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="1.6"/>',food:'<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M16 21V3c-2 1.5-3 4-3 7h3"/>',walk:'<circle cx="13" cy="4.5" r="1.8"/><path d="M10 21l2-6 2.5 2V21M9 12l2-4 3 1 2 3M11 8l-2 5"/>',pin:'<path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>',trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M9.5 17h5"/>',lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',star:'<path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4l-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z"/>',leaf:'<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14M5 19l7-7"/>',flame:'<path d="M12 21a6 6 0 0 0 6-6c0-4-3-6-4-10-2 2-3 4-3 6-1-1-1.5-2-1.5-3C7 10 6 12.5 6 15a6 6 0 0 0 6 6z"/>',ticket:'<path d="M4 8a2 2 0 0 0 0 4v4h16v-4a2 2 0 0 1 0-4V4H4zM14 4v16" transform="translate(0 2) scale(1 .9)"/>',info:'<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8v.01"/>',alert:'<path d="M12 4.5 21 19.5H3z"/><path d="M12 10.5v4M12 17v.01"/>'};function D({name:e,size:t=16,stroke:n=2}){return wl("svg",{width:t,height:t,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:n,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",dangerouslySetInnerHTML:{__html:vl[e]}})}import{jsx as tt,jsxs as Sn}from"react/jsx-runtime";function Ar({items:e}){let{send:t}=Br(_);return tt("div",{className:"hb-actions",children:e.map((n,r)=>Sn("button",{type:"button",className:"hb-pill",title:n.run,onClick:()=>t(n.run),children:[tt(D,{name:"spark",size:14,stroke:2.2}),n.label]},r))})}function $r({label:e,run:t,url:n}){let{send:r}=Br(_);if(t)return tt("div",{className:"hb-actions",children:Sn("button",{type:"button",className:"hb-pill",title:t,onClick:()=>r(t),children:[tt(D,{name:"spark",size:14,stroke:2.2}),e]})});return tt("div",{className:"hb-actions",children:Sn("a",{className:"hb-pill",href:n,target:"_blank",rel:"noreferrer",children:[tt(D,{name:"globe",size:14,stroke:2.2}),e]})})}var Nl=3;function Lr(e,t){let n=I([e.items,e.buttons]);if(!n)return t.drop("actions needs items");let r=[];if(n.forEach((o,a)=>{let i=f([o?.label,o?.text],40),s=f([o?.run,o?.ask,o?.message],300);if(!i||!s){t.at("items").at(a).drop("button needs a label and a run message");return}if(te(s)){t.at("items").at(a).drop(Xe);return}r.push({label:i,run:s})}),!r.length)return t.drop("actions has no usable button");return{type:"actions",items:B(r,Nl,t,"buttons")}}function Er(e,t){let n=f([e.label,e.text],40);if(!n)return t.drop("button needs a label");let r=f([e.run,e.ask,e.message],300),o=G(e.url);if(!r&&!o)return t.drop("button needs run or an https url");if(te(r))return t.drop(Xe);return w({type:"button",label:n,run:r,url:o})}import{useState as Ml}from"react";function Ot(){return typeof navigator<"u"&&navigator.language?navigator.language:"en-US"}function Fr(){return/-IN$/.test(Ot())}function Tn(e,t){return e.toLocaleString("en-IN",{maximumFractionDigits:t})}function Dt(e,t="%"){if(e===null||e===void 0||!isFinite(e))return"";let n=Math.abs(e).toFixed(1),r=t==="pt"?" pt":"%";return e>0?`▲ ${n}${r}`:e<0?`▼ ${n}${r}`:`${n}${r}`}var Cl=/^([$₹€£¥])(Cr|K|M|B)?$/,Sl=/^([$₹€£¥])(\s?\p{L}[\p{L} .]{0,11})$/u;function De(e,t){let n=Cl.exec(t??""),r=n??Sl.exec(t??"");if(!r)return null;let[,o,a=""]=r,i=Math.abs(e),s=i>=1000?0:n?a?1:2:i>=100?1:2,l=o==="₹"?Tn(i,s):de(i,{digits:s});return`${e<0?"-":""}${o}${l}${a==="Cr"?" Cr":a}`}function de(e,{digits:t}={}){let n=Math.abs(e);if(t===void 0)t=n>=1000?0:n>=100?1:2;return e.toLocaleString(Ot(),{maximumFractionDigits:t})}function Ir(e,t=Ot()){return new Intl.NumberFormat(t,{notation:"compact",maximumSignificantDigits:3}).format(e)}function zr(e,t=1){return`${de(e,{digits:t})}%`}function Be(e,t){let n=De(e,t);if(n!==null)return n;let r=de(e);if(t==="%")return`${r}%`;if(!t)return r;let o=/^[a-z]{3,}s$/i.test(t);if(e===1&&o)return`${r} ${t.slice(0,-1)}`;return`${r} ${t}`}import{jsx as Rr,Fragment as Tl}from"react/jsx-runtime";function E({text:e}){let t=[],n=/\*\*(.+?)\*\*/g,r=0;for(let o of e.matchAll(n)){if(o.index>r)t.push(e.slice(r,o.index));t.push(Rr("strong",{children:o[1]},o.index)),r=o.index+o[0].length}if(r<e.length)t.push(e.slice(r));return Rr(Tl,{children:t})}import{jsx as ne,jsxs as _t}from"react/jsx-runtime";function Pr({text:e}){return ne("div",{className:"hb-heading",children:ne(E,{text:e})})}function Or({text:e}){return ne("div",{className:"hb-text",children:ne(E,{text:e})})}function Dr(){return ne("div",{className:"hb-divider",role:"separator"})}function _r({text:e,tone:t}){return ne("div",{className:"hb-badge",children:ne("span",{className:`hb-chip hb-chip-${t??"plain"}`,children:e})})}function Hr({text:e,url:t}){return ne("div",{className:"hb-link",children:_t("a",{href:t,target:"_blank",rel:"noreferrer",children:[ne(D,{name:"globe",size:14,stroke:2.2}),e]})})}function Wr({url:e,caption:t}){let[n,r]=Ml(!1);if(n)return null;return _t("figure",{className:"hb-image",children:[ne("img",{src:e,alt:t??"",loading:"lazy",referrerPolicy:"no-referrer",onError:()=>r(!0)}),t&&ne("figcaption",{children:t})]})}function Bl(e,t,n){if(t===100&&!n)return`${e}%`;let r=De(e,n);if(r!==null)return`${r} / ${De(t,n)}`;let o=`${de(e,{digits:3})} / ${de(t,{digits:3})}`;return n?`${o} ${n}`:o}function Kr({label:e,value:t,max:n,unit:r}){let o=Math.max(0,Math.min(1,t/n));return _t("div",{className:"hb-card hb-bar",children:[_t("div",{className:"hb-bar-head",children:[ne("span",{className:"hb-bar-label",children:e}),ne("span",{className:"hb-bar-amount",children:Bl(t,n,r)})]}),ne("div",{className:"hb-bar-track",children:ne("span",{className:"hb-bar-fill",style:{width:`${o*100}%`}})})]})}function Vr(e,t){let n=f([e.text,e.title],80);if(!n)return t.drop("heading needs text");return{type:"heading",text:n}}function Gr(e,t){let n=pe([e.text,e.content,e.body],600);if(!n)return t.drop("text needs text");return{type:"text",text:n}}function Xr(){return{type:"divider"}}function Al(e){let t=typeof e==="string"?e.toLowerCase():"";if(["good","success","positive","ok"].includes(t))return"good";if(["warn","warning","bad","negative","danger"].includes(t))return"warn";return}function Ur(e,t){let n=pe([e.text,e.label],40);if(!n)return t.drop("badge needs text");return w({type:"badge",text:n,tone:Al(e.tone)})}function jr(e,t){let n=G(e.url)??G(e.href);if(!n)return t.drop("link needs an https url");return{type:"link",text:f([e.text,e.label,e.title],80)??$l(n),url:n}}function $l(e){try{return new URL(e).hostname.replace(/^www\./,"")}catch{return e}}function Yr(e,t){let n=G(e.url)??G(e.src)??G(e.image);if(!n)return t.drop("image needs an https url");return w({type:"image",url:n,caption:f([e.caption,e.alt,e.title],80)})}function qr(e,t){let n=f([e.label,e.title],40);if(!n)return t.drop("bar needs a label");let r=M(e.value);if(r===null)return t.drop("bar needs a numeric value");let o=M(e.max)??M(e.goal)??M(e.total)??100;if(o<=0)o=100;return w({type:"bar",label:n,value:r,max:o,unit:A(e.unit,12)})}import{useMemo as Oc,useState as Dc}from"react";var Ll=["line","bar","area","stacked","hbar","combo","pie","donut"],El={doughnut:"donut",stackedbar:"stacked",horizontalbar:"hbar",barh:"hbar"};function Wt(e){if(typeof e!=="string")return"line";let t=e.toLowerCase().replace(/[\s_-]/g,""),n=Ll.find((r)=>r===t);if(n)return n;return El[t]??"line"}function eo(e){if(e==="stacked"||e==="area")return 6;return 3}function to(e,t,n,r,o){if(e!=="combo"||t===0)return!1;if(r==="right")return!0;return n!==void 0&&n!==o}var Mn="(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|june?|july?|aug(ust)?|sep(t(ember)?)?|oct(ober)?|nov(ember)?|dec(ember)?)\\.?",Ht="('?\\d{2}|\\d{4})",Zr=`(fy\\s*)?${Ht}([-/]\\d{2,4})?`,Fl=["-?\\d+(\\.\\d+)?",`${Mn}(\\s*[-'’/]?\\s*${Ht})?`,`\\d{1,2}\\s+${Mn}(,?\\s+${Ht})?`,`${Mn}\\s+\\d{1,2}(,?\\s+\\d{4})?`,`q[1-4](\\s*[-'’]?\\s*${Zr})?`,`${Zr}\\s*-?\\s*q[1-4]`,`fy\\s*${Ht}([-/]\\d{2,4})?`,"\\d{4}-\\d{2}(-\\d{2}([t ].*)?)?","\\d{1,2}[/.-]\\d{1,2}[/.-]\\d{2,4}","(year|yr|month|week|wk|day|hour|hr)s?\\s*\\d+"].map((e)=>new RegExp(`^${e}$`,"i"));function Il(e){let t=String(e).trim();return Fl.some((n)=>n.test(t))}function no(e){if(e.type!=="bar")return e.type;let{x:t}=e;if(t.every(Il))return"bar";return t.some((r)=>String(r).length>12)||t.length>=2&&t.length<=3||e.series.length===1&&t.length>=9?"hbar":"bar"}function ro(e){let t=e.filter((n)=>n!==null);if(t.length<2||t[0]===0)return null;return(t[t.length-1]-t[0])/Math.abs(t[0])*100}var Jr=8;function oo(e,t){let n=[];if(t.forEach((s,l)=>{if(s!==null&&s>0&&l<e.length)n.push({label:e[l],value:s})}),n.length<=Jr)return{x:n.map((s)=>s.label),data:n.map((s)=>s.value)};let r=[...n].sort((s,l)=>l.value-s.value),o=new Set(r.slice(0,Jr-1)),a=n.filter((s)=>o.has(s)),i=0;for(let s of n)if(!o.has(s))i+=s.value;return{x:[...a.map((s)=>s.label),"Other"],data:[...a.map((s)=>s.value),i]}}function ao(e,t){let n=Array(t).fill(0),r=Array(t).fill(0);return e.map((o)=>{let a=[];for(let i=0;i<t;i++){let s=o.data[i]??null;if(s===null)a.push(null);else if(s>=0)a.push({from:n[i],to:n[i]+s}),n[i]+=s;else a.push({from:r[i],to:r[i]+s}),r[i]+=s}return a})}function io(e,t){let n=null;for(let r of e){let o=r.data[t]??null;if(o!==null)n=(n??0)+o}return n}function Bn(e,t){if(!e.length)return{min:0,max:1};let n=Math.min(...e),r=Math.max(...e);if(t)n=Math.min(0,n);let o=(r-n||Math.abs(r)||1)*0.08;return{min:t&&n>=0?0:n-o,max:r+o}}function K(e){return`var(--hb-chart-${e%8+1})`}function Kt(e){let t=e*100;if(t<10)return`${+t.toFixed(1)}%`;return`${Math.round(t)}%`}function so(e,t){let n=e.filter((o)=>o!==null),r=n.reduce((o,a)=>o+a,0);if(n.some((o)=>o<0)||r<=0)return;return`${Kt(t/r)} of total`}function Ae(e,t){return e[t].name??(e.length===1?"Value":`Series ${t+1}`)}function lo(e,t){if(t){let i=t.flat().flatMap((s)=>s===null?[]:[s.from,s.to]);return{left:Bn(i,!0),right:null}}let n=e.series.filter((i)=>!i.right).flatMap((i)=>Qr(i.data)),r=e.series.filter((i)=>i.right).flatMap((i)=>Qr(i.data)),o=e.type==="bar"||e.type==="combo",a=r.length?Bn(r,!1):null;return{left:Bn(n,o),right:a}}function Qr(e){return e.filter((t)=>t!==null)}var xt=1e5,zl=12;function F(e,t,{full:n=!1}={}){let r=(t?.length??0)>1?De(e,t):null;if(r!==null)return r;if(t==="%")return zr(e);let o=Math.abs(e),a=t==="₹"||t==="INR",i=a?"₹":t&&/^[$€£¥]$/.test(t)?t:"",s=!n&&o>=xt,l=o>=1000?0:2,c=s?Ir(o,a||Fr()?"en-IN":void 0):a?Tn(o,l):de(o,{digits:l}),p=`${e<0?"-":""}${i}${c}`;return i||!t||t==="pts"||t.length>zl?p:`${p} ${t}`}var ho={min:[1,10],max:[1,10],round:[1,2],abs:[1,1],if:[3,3],emi:[3,3],sip:[3,3],pct:[2,2],prepay_years:[4,4],prepay_interest:[4,4],balance:[4,4],principal_paid:[4,4],interest_paid:[4,4],sip_value:[3,3]};function _e(e){return Object.hasOwn(ho,e)}var Vt=/\s*(?:((?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)|([A-Za-z_][A-Za-z0-9_]*)|(<=|>=|==|!=|[-+*/^(),<>]))/iy;function Rl(e){if(e.length>300)throw Error("formula too long");let t=[];Vt.lastIndex=0;while(Vt.lastIndex<e.length){let n=Vt.lastIndex;if(/^\s*$/.test(e.slice(n)))break;let r=Vt.exec(e);if(!r)throw Error(`can't read "${e.slice(n).trim().slice(0,12)}"`);t.push(r[1]??r[2]??r[3])}return t}function ye(e){let t=Rl(e),n=0,r=0,o=()=>t[n],a=(b)=>{let m=t[n];if(b!==void 0&&m!==b)throw Error(`expected ${b}`);return n+=1,m},i=()=>{if(r+=1,r>30)throw Error("formula nests too deep")};function s(){let b=l();if(["<","<=",">",">=","==","!="].includes(o()))return{kind:"binary",op:a(),left:b,right:l()};return b}function l(){let b=c();while(o()==="+"||o()==="-")b={kind:"binary",op:a(),left:b,right:c()};return b}function c(){let b=p();while(o()==="*"||o()==="/")b={kind:"binary",op:a(),left:b,right:p()};return b}function p(){i();let b;if(o()==="-")a(),b={kind:"negate",arg:p()};else if(o()==="+")a(),b=p();else b=d();return r-=1,b}function d(){let b=h();if(o()==="^")return a(),{kind:"binary",op:"^",left:b,right:p()};return b}function h(){let b=a();if(b===void 0)throw Error("formula ends too soon");if(/^[\d.]/.test(b))return{kind:"number",value:Number(b)};if(b==="("){let k=s();return a(")"),k}if(!/^[A-Za-z_]/.test(b))throw Error(`unexpected "${b}"`);if(o()!=="(")return{kind:"name",name:b};if(!_e(b))throw Error(`unknown helper ${b}()`);a("(");let m=[s()];while(o()===",")a(),m.push(s());a(")");let[N,y]=ho[b];if(m.length<N||m.length>y)throw Error(`${b}() takes ${N===y?N:`${N}-${y}`} values`);return{kind:"call",fn:b,args:m}}let u=s();if(n<t.length)throw Error(`unexpected "${t[n]}"`);return u}function xe(e,t=new Set){if(e.kind==="name")t.add(e.name);if(e.kind==="negate")xe(e.arg,t);if(e.kind==="binary")xe(e.left,t),xe(e.right,t);if(e.kind==="call")e.args.forEach((n)=>xe(n,t));return[...t]}function Gt(e){return{left:e}}function bo(e,t=1){if(!e)return;if(e.left-=t,e.left<0)throw Error("too much work")}function Ue(e,t,n){try{let r=typeof e==="string"?ye(e):e,o=fo(r,t,n);if(!Number.isFinite(o))return null;return o}catch{return null}}function fo(e,t,n){bo(n);let r=(o)=>fo(o,t,n);switch(e.kind){case"number":return e.value;case"name":{let o=t.get(e.name);if(o===void 0)throw Error(`unknown name ${e.name}`);return o}case"negate":return-r(e.arg);case"binary":return Pl(e.op,r(e.left),r(e.right));case"call":{if(e.fn==="if")return r(e.args[0])!==0?r(e.args[1]):r(e.args[2]);return Ol(e.fn,e.args.map(r),n)}}}function Pl(e,t,n){if(e==="+")return t+n;if(e==="-")return t-n;if(e==="*")return t*n;if(e==="/")return mo(t,n);if(e==="^")return t**n;return{"<":t<n,"<=":t<=n,">":t>n,">=":t>=n,"==":t===n,"!=":t!==n}[e]?1:0}function mo(e,t){if(t===0)throw Error("division by zero");return e/t}function Ol(e,t,n){switch(e){case"min":return Math.min(...t);case"max":return Math.max(...t);case"abs":return Math.abs(t[0]);case"round":return Dl(t[0],t[1]??0);case"pct":return mo(t[0],t[1])*100;case"emi":return Xt(t[0],t[1],t[2]);case"sip":return po(t[0],t[1],t[2]);case"prepay_years":return uo(t[0],t[1],t[2],t[3],n).months/12;case"prepay_interest":return uo(t[0],t[1],t[2],t[3],n).interest;case"balance":return go(t[0],t[1],t[2],t[3]);case"principal_paid":return xo(t[0],t[1],t[2],t[3]);case"interest_paid":return _l(t[0],t[1],t[2],t[3]);case"sip_value":return po(t[0],t[1],t[2])}throw Error(`unknown helper ${e}()`)}function Dl(e,t){let n=10**Math.round(t);return Math.round(e*n)/n}var co=100;function An(e){if(!(e<=co))throw Error(`a loan term is at most ${co} years`);return e*12}function Xt(e,t,n){let r=An(n);if(r<=0)throw Error("emi needs a term");let o=t/12/100;if(o===0)return e/r;let a=(1+o)**r;return e*o*a/(a-1)}function po(e,t,n){let r=n*12,o=t/12/100;if(o===0)return e*r;return e*((1+o)**r-1)/o*(1+o)}function go(e,t,n,r){let o=An(n);if(o<=0)throw Error("balance needs a term");let a=r*12;if(a<=0)return e;if(a>=o)return 0;let i=t/12/100;if(i===0)return e*(1-a/o);let s=(1+i)**a;return Math.max(0,e*s-Xt(e,t,n)*(s-1)/i)}function xo(e,t,n,r){return e-go(e,t,n,r)}function _l(e,t,n,r){let o=Math.min(Math.max(r*12,0),n*12);return Xt(e,t,n)*o-xo(e,t,n,r)}function uo(e,t,n,r,o){if(r<0)throw Error("the yearly extra can't be negative");let a=Xt(e,t,n),i=t/12/100,s=Math.ceil(An(n)),l=e,c=0,p=0;while(l>0.005&&p<s){bo(o),p+=1;let d=l*i;if(c+=d,l=Math.max(0,l+d-a),p%12===0)l=Math.max(0,l-r)}return{months:p,interest:c}}var $n=200,Hl=3,En=1e6,Wl=/^[A-Za-z_][A-Za-z0-9_]{0,23}$/;function yo(e,t,n){if(!e||typeof e!=="object"||Array.isArray(e))return n.drop("chart must be an object")??void 0;let r=e.x&&typeof e.x==="object"?e.x:{},o=A(r.name,24),a=!o||!Wl.test(o)?'x needs a name like "y"':t.includes(o)?`x name "${o}" is an input's id`:_e(o)?`x name "${o}" is a helper's name`:null;if(a)return n.drop(a)??void 0;let i=Ln(r.from)??0,s=Ln(r.to),l=Ln(r.step)??1;if(s===null)return n.drop("x needs from, to and step (numbers or formulas)")??void 0;let c=[];if((I([e.series])??[]).forEach((d,h)=>{let u=n.at("series").at(h),b=f([d?.name,d?.label],40),m=f([d?.formula,d?.expr],300);if(!b||!m)return u.drop("series needs a name and a formula");Vl(m,[...t,o],u),c.push({name:b,formula:m})}),!c.length)return n.drop("chart has no usable series")??void 0;let p=Wt(e.kind);return w({kind:p==="area"||p==="bar"?p:"line",title:f([e.title],80),unit:f([e.unit],12),x:w({name:o,from:i,to:s,step:l,label:Kl(f([r.label],40),o)}),series:B(c,Hl,n,"series")})}function Kl(e,t){if(!e)return;let n=`{${t}}`,r=e.match(/\{[^{}]*\}/g)??[];return(r.length===1?e.replace(r[0],n):e).split(n).map((a)=>a.replace(/[{}]/g,"")).join(n).trim()||void 0}function Ln(e){return M(e)??A(e,300)??null}function Vl(e,t,n){try{let r=xe(ye(e)).filter((o)=>!t.includes(o));if(r.length)n.drop(`formula uses ${r.join(", ")}, which no input has; leaves gaps`)}catch(r){n.drop(`formula can't be read (${r.message}); leaves gaps`)}}function ko(e,t){let n=Gt(En),r=(h)=>typeof h==="number"?h:Ue(h,t,n),o=r(e.x.from),a=r(e.x.to),i=r(e.x.step);if(o===null||a===null||i===null)return null;let s=Gl(o,a,i);if(!s.length)return null;let l=e.series.map((h)=>Xl(h.formula)),c=e.series.map((h,u)=>{let b=s.map((m)=>{let N=l[u];return N?Ue(N,new Map(t).set(e.x.name,m),n):null});return{name:h.name,data:b,right:!1}});if(c.every((h)=>h.data.every((u)=>u===null)))return null;let p=(h)=>e.x.label?e.x.label.split(`{${e.x.name}}`).join(String(h)):String(h),d=e.kind==="area"&&c.length>1?"line":e.kind;return w({type:d,title:e.title,x:s.map(p),series:c,unit:e.unit,figure:!1})}function Gl(e,t,n){if(!(n>0)||t<e)return[];let r=(i)=>Math.floor((t-e)/i+0.000000001)+1,o=n;if(r(o)>$n)o=n*Math.ceil(r(o)/$n);if(!Number.isFinite(r(o)))return[];let a=Math.min(r(o),$n);return Array.from({length:a},(i,s)=>Math.round((e+s*o)*1e9)/1e9)}function Xl(e){try{return ye(e)}catch{return null}}import{useId as Lc,useMemo as Zt,useRef as Vo,useState as Ec}from"react";function je(e,t=11){return e.length*t*0.6}function vo(e,t,n){if(e<=1||t<=0)return[0];let r=Math.max(1,Math.ceil(n/t)),o=[];for(let a=0;a<e;a+=r)o.push(a);return o}var Ul=96,jl=14,Yl=56;function wo(e,t,n){let r=Math.min(e/Math.max(t,1),Ul),o=Math.min(Math.max(r*0.6/n,jl),Yl),a=Math.min(o,r*0.9/n);return{slot:r,bar:a,start:(e-r*t)/2}}function Fn(e,t,n,r,o=4){let a=(c)=>+c.toFixed(1),i=Math.min(o,t/2,Math.abs(n-r)),s=r<n?1:-1,l=e+t;return`M${a(e)},${a(n)}V${a(r+s*i)}Q${a(e)},${a(r)} ${a(e+i)},${a(r)}H${a(l-i)}Q${a(l)},${a(r)} ${a(l)},${a(r+s*i)}V${a(n)}Z`}var ql=12;function Ye(e){if(e.length>ql)return Zl(e);let t=(n)=>+n.toFixed(1);return e.map(([n,r],o)=>`${o?"L":"M"}${t(n)},${t(r)}`).join("")}function Zl(e){if(!e.length)return"";let t=(r)=>+r.toFixed(1),n=`M${t(e[0][0])},${t(e[0][1])}`;for(let r=0;r<e.length-1;r++){let o=e[r-1]??e[r],a=e[r],i=e[r+1],s=e[r+2]??i;n+=` C${t(a[0]+(i[0]-o[0])/6)},${t(a[1]+(i[1]-o[1])/6)} ${t(i[0]-(s[0]-a[0])/6)},${t(i[1]-(s[1]-a[1])/6)} ${t(i[0])},${t(i[1])}`}return n}function No(e,t=14,n=1/0){let r=e.map((i,s)=>s).sort((i,s)=>e[i]-e[s]),o=r.map((i)=>e[i]);for(let i=1;i<o.length;i++)o[i]=Math.max(o[i],o[i-1]+t);if(o.length&&o[o.length-1]>n){o[o.length-1]=n;for(let i=o.length-2;i>=0;i--)o[i]=Math.min(o[i],o[i+1]-t)}let a=Array(e.length);return r.forEach((i,s)=>a[i]=o[s]),a}function Co(e,t,n=3){if(e===t)[e,t]=[e-1,t+1];let r=(t-e)/n,o=10**Math.floor(Math.log10(r)),a=o*([1,2,2.5,5].find((s)=>r/o<=s)??10),i=[];for(let s=Math.floor(e/a);s<=Math.ceil(t/a);s++)i.push(+(s*a).toFixed(10));return i}var Jl=210,Ql=220,ec=10,tc=26,nc=16,So=8,rc=12,oc=80,To=16,In=8;function zn(e){return e.type==="line"&&e.tone==="change"&&e.series.length===1}function nt(e){let t=e.find((r)=>r!==null)??null,n=e.length-1;while(n>=0&&e[n]===null)n--;return{first:t,last:n}}function Ut(e,t,n){if(!zn(e))return K(t);let r=nt(e.series[0].data).first??n;return n>=r?"var(--hb-good)":"var(--hb-warn)"}var Rn=(e,t)=>t.unit??e.unit;function Mo(e,t,n){let r=e.x.length,o=e.type==="bar"||e.type==="stacked"||e.type==="combo",a=o?Jl:Ql,i=a-tc,s=e.type==="line"?dc(e):[],l=ac(e),c=l.length?In+Math.max(...l.map((P)=>je(F(P,e.unit)))):0,p=(o?4:So)+c,d=s.length?Math.min(110,14+Math.max(...s.map((P)=>je(P.text,11.5)))):0,h=t-(d||(o?4:So)),u=h-p,b=e.type==="bar"?e.series.length:1,m=wo(u,r,b),N=(P)=>o?p+m.start+m.slot*(P+0.5):p+(r===1?u/2:u*P/(r-1)),y=o?m.slot:r>1?u/(r-1):0,k=e.type==="bar"&&r*b<=rc&&e.series.every((P)=>P.data.every((me)=>me===null||je(F(me,Rn(e,P)),11.5)<=m.slot/b)),S=ec+(k?nc:0),x=({min:P,max:me})=>(vn)=>S+(i-S)*(1-(vn-P)/(me-P||1)),v=x(l.length?{min:l[0],max:l[l.length-1]}:n.left),C=n.right?x(n.right):v,T=(P)=>P.right?C:v,L=Math.max(...e.x.map((P)=>je(String(P)))),R=o?L+8:Math.max(oc,L+12),V=vo(r,y,R),j=s.map((P)=>v(P.value)),H=No(j,14,i),Me=s.map((P,me)=>({series:P.series,at:P.at,text:P.text,dotY:j[me],y:H[me],dot:Ut(e,P.series,P.value),ink:e.series.length===1?"var(--hb-ink)":K(P.series)}));return{W:t,H:a,left:p,right:h,top:S,base:i,slotted:o,bar:m.bar,xAt:N,yAt:v,yOf:T,xLabels:V,valueLabels:k,ends:Me,ticks:l}}function ac(e){if(e.type!=="line"||e.series.length<2)return[];let t=e.series.flatMap((n)=>n.data.filter((r)=>r!==null));return t.length?Co(Math.min(...t),Math.max(...t)):[]}var ic=6,sc=14,lc=9,cc=6;function Bo(e,t,n,r,o){let a=pc(e,t,n),i=r-Math.min(r,...a),s=Math.max(r,...a)-r,l=r-ic,c=r+sc;if(i>s)return c<=o+cc?c:l;return l-lc>=0?l:c}function pc(e,t,n){let r=[];return e.forEach(([o,a],i)=>{if(o>=t&&o<=n)r.push(a);let s=e[i+1];if(!s)return;for(let l of[t,n])if(o<l&&s[0]>l)r.push(a+(s[1]-a)*(l-o)/(s[0]-o))}),r}function dc(e){let t=e.series.length===1;return e.series.flatMap((n,r)=>{let o=nt(n.data).last;if(o<0)return[];let a=n.data[o],i=Ae(e.series,r),s=t?F(a,Rn(e,n)):i.length>To?`${i.slice(0,To-1)}…`:i;return[{series:r,at:o,value:a,text:s}]})}function Ao(e,t,n){let r=[],o=n.base,a=0;return e.series.forEach((i,s)=>{let l=i.data[t]??null;if(l===null)return;r.push({colour:Ut(e,s,l),name:Ae(e.series,s),value:F(l,Rn(e,i),{full:!0})}),a+=Math.max(l,0),o=Math.min(o,n.yOf(i)(e.type==="stacked"||e.type==="area"?a:l))}),{x:n.xAt(t),y:o,title:String(e.x[t]),rows:r,note:uc(e,t)}}function uc(e,t){if(e.series.length!==1||e.type!=="line")return;let n=e.series[0].data,r=n[t]??null,o=n.findIndex((i)=>i!==null),a=n[o];if(r===null||t<=o||a===0)return;return`${Dt((r-a)/Math.abs(a)*100)} since start`}import{useLayoutEffect as hc,useState as bc}from"react";var fc=560;function ke(e){let[t,n]=bc(0);return hc(()=>{let r=e.current;if(!r)return;let o=()=>n(Math.round(r.getBoundingClientRect().width));if(o(),typeof ResizeObserver>"u")return;let a=new ResizeObserver(o);return a.observe(r),()=>a.disconnect()},[e]),t||fc}function mc(e,t,n,r=!1){let o=t==="ArrowRight"||r&&t==="ArrowDown",a=t==="ArrowLeft"||r&&t==="ArrowUp";if(t==="Escape")return null;if(o)return e===null?0:Math.min(n-1,e+1);if(a)return e===null?n-1:Math.max(0,e-1);return}function rt(e,t,n,r=!1){return{tabIndex:0,onKeyDown:(o)=>{let a=mc(t,o.key,e,r);if(a===void 0)return;o.preventDefault(),n(a)},onBlur:()=>n(null)}}import{useLayoutEffect as gc,useRef as xc,useState as yc}from"react";import{jsx as ot,jsxs as $o,Fragment as vc}from"react/jsx-runtime";var Pn=12;function kc(e,t,n,r,o){let a=e+Pn;if(a+n>o-2)a=Math.max(2,e-Pn-n);let i=t-r-Pn;if(i<-8)i=t+14;return{left:a,top:i}}function at({tip:e}){let t=xc(null),[n,r]=yc(e);if(e&&e!==n)r(e);let o=e??n;return gc(()=>{let a=t.current;if(!a||!e)return;let i=a.offsetParent,{left:s,top:l}=kc(e.x,e.y,a.offsetWidth,a.offsetHeight,i?.clientWidth??0);a.style.left=`${s}px`,a.style.top=`${l}px`},[e]),ot("div",{ref:t,className:`hb-tip${e?" hb-tip-on":""}`,role:"status","aria-live":"polite",children:o&&$o(vc,{children:[ot("div",{className:"hb-tip-title",children:o.title}),o.rows.map((a,i)=>$o("div",{className:"hb-tip-row",children:[ot("i",{style:{background:a.colour}}),ot("span",{className:"hb-tip-name",children:a.name}),ot("b",{className:"hb-tip-value",children:a.value})]},i)),o.note&&ot("div",{className:"hb-tip-note",children:o.note})]})})}import{jsx as jt,jsxs as wc}from"react/jsx-runtime";function yt({series:e,at:t,unit:n}){return jt("div",{className:"hb-legend",children:e.map((r,o)=>{let a=t===void 0?null:r.data[t]??null;return wc("span",{className:"hb-legend-item",children:[jt("i",{className:"hb-legend-dot",style:{background:K(o)}}),Ae(e,o),a!==null&&jt("span",{className:"hb-legend-value",children:F(a,r.unit??n)}),r.right&&jt("span",{className:"hb-legend-note",children:"(right scale)"})]},o)})})}import{jsx as Z,jsxs as it}from"react/jsx-runtime";function Lo({spec:e,layout:t,gid:n,hover:r}){let{xAt:o,yAt:a,left:i,right:s,top:l,base:c}=t,p=e.series.length===1,d=zn(e)?nt(e.series[0].data).first:null,h=a(0),u=!p&&h>l&&h<c;return it("g",{children:[t.ticks.length?Z(Nc,{spec:e,layout:t}):Z("line",{x1:i,x2:s,y1:c,y2:c,className:"hb-chart-rule"}),u&&Z("line",{x1:i,x2:s,y1:h,y2:h,className:"hb-chart-rule-strong",strokeDasharray:"3 3"}),d!==null&&Z(Cc,{spec:e,layout:t,gid:n,start:d}),e.series.map((b,m)=>{let N=Eo(b.data,t);if(!N.length)return null;return Z("path",{d:Ye(N),fill:"none",stroke:d!==null?`url(#change-${n})`:K(m),strokeWidth:p?2.25:1.75,strokeLinejoin:"round",strokeLinecap:"round",pathLength:1,strokeDasharray:"1",strokeDashoffset:"1",className:"hb-chart-line hb-chart-draw"},m)}),t.ends.map((b)=>it("g",{children:[Z("circle",{cx:o(b.at),cy:b.dotY,r:"3.5",fill:b.dot,className:"hb-chart-dot"}),Z("text",{x:o(b.at)+8,y:b.y+4,className:"hb-chart-end",style:{fill:b.ink},children:b.text})]},b.series)),r!==null&&it("g",{children:[Z(On,{layout:t,at:r}),e.series.map((b,m)=>{let N=b.data[r]??null;return N===null?null:Z("circle",{cx:o(r),cy:a(N),r:"4",fill:Ut(e,m,N),className:"hb-chart-dot"},m)})]})]})}function Nc({spec:e,layout:t}){let{left:n,right:r,yAt:o}=t;return Z("g",{children:t.ticks.map((a)=>it("g",{children:[Z("line",{x1:n,x2:r,y1:o(a),y2:o(a),className:"hb-chart-rule"}),Z("text",{x:n-In,y:o(a)+4,textAnchor:"end",className:"hb-chart-tick",children:F(a,e.unit)})]},a))})}function Eo(e,{xAt:t,yAt:n}){return e.flatMap((r,o)=>r===null?[]:[[t(o),n(r)]])}function Cc({spec:e,layout:t,gid:n,start:r}){let{left:o,right:a,top:i,base:s,yAt:l}=t,c=l(r),p=Math.min(1,Math.max(0,(c-i)/(s-i||1))),d=`Start ${F(r,e.series[0].unit??e.unit)}`,h=Bo(Eo(e.series[0].data,t),o,o+2+je(d),c,s);return it("g",{children:[Z("defs",{children:it("linearGradient",{id:`change-${n}`,gradientUnits:"userSpaceOnUse",x1:"0",x2:"0",y1:i,y2:s,children:[Z("stop",{offset:p,style:{stopColor:"var(--hb-good)"}}),Z("stop",{offset:p,style:{stopColor:"var(--hb-warn)"}})]})}),Z("line",{x1:o,x2:a,y1:c,y2:c,className:"hb-chart-rule-strong",strokeDasharray:"3 3"}),Z("text",{x:o+2,y:h,className:"hb-chart-axis hb-chart-halo",children:d})]})}function On({layout:e,at:t}){let n=e.xAt(t);return Z("line",{x1:n,x2:n,y1:e.top,y2:e.base,className:"hb-chart-rule-strong"})}import{jsx as ve,jsxs as kt}from"react/jsx-runtime";var Sc=2,Dn=(e,t)=>e===null||e===t?1:0.55;function _n({layout:e}){let t=e.yAt(0);return ve("line",{x1:e.left,x2:e.right,y1:t,y2:t,className:"hb-chart-rule-strong"})}function Fo({spec:e,layout:t,hover:n}){let{xAt:r,yAt:o,bar:a}=t,i=e.series.length,s=o(0);return kt("g",{children:[e.series.map((l,c)=>l.data.map((p,d)=>{if(p===null)return null;let h=r(d)-a*i/2+c*a,u=i>1?a-Sc:a,b=o(p);return kt("g",{opacity:Dn(n,d),children:[ve("path",{d:Fn(h,u,s,b),fill:K(c),className:"hb-chart-bar"}),t.valueLabels&&ve("text",{x:h+u/2,y:p<0?b+14:b-6,textAnchor:"middle",className:"hb-chart-value",children:F(p,l.unit??e.unit)})]},`${c}-${d}`)})),ve(_n,{layout:t})]})}function Io({bands:e,layout:t,hover:n}){let{xAt:r,yAt:o,bar:a}=t;return kt("g",{children:[e.map((i,s)=>i.map((l,c)=>l===null||l.from===l.to?null:ve("rect",{x:r(c)-a/2,y:Math.min(o(l.from),o(l.to)),width:a,height:Math.max(Math.abs(o(l.from)-o(l.to))-2,1),rx:"3",fill:K(s),opacity:Dn(n,c)},`${s}-${c}`))),ve(_n,{layout:t})]})}function zo({spec:e,layout:t,hover:n}){let{xAt:r,yAt:o,bar:a}=t,i=o(0);return kt("g",{children:[e.series[0].data.map((s,l)=>s===null?null:ve("path",{d:Fn(r(l)-a/2,a,i,o(s)),fill:K(0),opacity:Dn(n,l),className:"hb-chart-bar"},l)),ve(_n,{layout:t}),e.series.slice(1).map((s,l)=>{let c=t.yOf(s),p=s.data.flatMap((h,u)=>h===null?[]:[[r(u),c(h)]]);if(!p.length)return null;let d=K(l+1);return kt("g",{children:[ve("path",{d:Ye(p),fill:"none",stroke:d,strokeWidth:"2.25",strokeLinejoin:"round",strokeLinecap:"round"}),p.map(([h,u],b)=>ve("circle",{cx:h,cy:u,r:"3.5",fill:d,className:"hb-chart-dot"},b))]},l)})]})}import{jsx as Yt,jsxs as Po}from"react/jsx-runtime";function Ro({bands:e,layout:t}){return Po("g",{children:[Yt("line",{x1:t.left,x2:t.right,y1:t.base,y2:t.base,className:"hb-chart-rule"}),e.map((n,r)=>Yt(Tc,{bands:n,layout:t,colour:K(r)},r))]})}function Tc({bands:e,layout:t,colour:n}){let r=[],o=[];if(e.forEach((s,l)=>{if(s===null)return;r.push([t.xAt(l),t.yAt(s.to)]),o.push([t.xAt(l),t.yAt(s.from)])}),!r.length)return null;let a=Ye(r),i=Ye(o.reverse()).replace(/^M/,"L");return Po("g",{children:[Yt("path",{d:`${a} ${i} Z`,fill:n,fillOpacity:".3"}),Yt("path",{d:a,fill:"none",stroke:n,strokeWidth:"2",strokeLinejoin:"round",strokeLinecap:"round"})]})}import{Fragment as Mc,useRef as Oo,useState as Do}from"react";import{jsx as he,jsxs as qt}from"react/jsx-runtime";function _o({spec:e}){let[t,n]=Do(null),[r,o]=Do(null),a=Oo(null),i=Oo([]),s=e.series.flatMap((x)=>x.data.filter((v)=>v!==null)),l=Math.min(0,...s),p=Math.max(0,...s)-l||1,d=-l/p*100,h=e.series.length===1,u=l<0,b=(x,v)=>{if(!h||!u)return K(x);return v>=0?"var(--hb-good)":"var(--hb-warn)"},m=(x)=>e.series[x].unit??e.unit,N=(x)=>{let v=Math.max(Math.abs(x)/p*100,1.5);return{left:x<0?d-v:d,width:v}};function y(x){o(x);let v=x===null?null:i.current[x];if(x===null||!v||!a.current)return n(null);let C=[],T=d;e.series.forEach((V,j)=>{let H=V.data[x]??null;if(H===null)return;C.push({colour:b(j,H),name:Ae(e.series,j),value:F(H,m(j),{full:!0})});let{left:Me,width:P}=N(H);T=Math.max(T,Me+P)});let L=v.getBoundingClientRect(),R=a.current.getBoundingClientRect();n({x:L.left-R.left+L.width*T/100,y:L.top-R.top,title:String(e.x[x]),rows:C})}let k=(x)=>r===null||r===x?1:0.55,S=(x)=>({onPointerEnter:()=>y(x),onPointerDown:()=>y(x)});return qt("figure",{className:"hb-card hb-chart",children:[he("figcaption",{className:"hb-chart-title",children:e.title??e.series[0].name??"Chart"}),!h&&he(yt,{series:e.series}),qt("div",{ref:a,className:"hb-hbar-box",children:[he("div",{className:`hb-hbar-grid${h?"":" hb-hbar-many"}`,role:"img","aria-label":e.title??"chart",...rt(e.x.length,r,y,!0),onPointerLeave:()=>y(null),children:e.x.map((x,v)=>qt(Mc,{children:[he("div",{className:"hb-hbar-label",...S(v),children:x}),he("div",{className:"hb-hbar-tracks",ref:(C)=>{i.current[v]=C},...S(v),children:e.series.map((C,T)=>{let L=C.data[v]??null,R=L===null?null:N(L);return qt("div",{className:"hb-hbar-track",children:[u&&he("div",{className:"hb-hbar-zero",style:{left:`${d}%`}}),L!==null&&R&&he("div",{className:"hb-hbar-bar",style:{left:`${R.left}%`,width:`${R.width}%`,background:b(T,L),opacity:k(v)}})]},T)})}),he("div",{className:"hb-hbar-values",...S(v),children:e.series.map((C,T)=>{let L=C.data[v]??null,R=h&&u&&L!==null?L>=0?" hb-hbar-up":" hb-hbar-down":"";return he("span",{className:`hb-hbar-value${R}`,children:L===null?"–":F(L,m(T))},T)})})]},v))}),he(at,{tip:t})]}),e.source&&he("div",{className:"hb-chart-source",children:e.source})]})}import{useRef as Bc,useState as Ho}from"react";import{jsx as re,jsxs as st}from"react/jsx-runtime";var vt=168,We=vt/2,He=80,Wo=52;function wt(e,t){let n=e*2*Math.PI;return[+(We+t*Math.sin(n)).toFixed(2),+(We-t*Math.cos(n)).toFixed(2)]}function Ac(e,t,n){let r=Math.min(t,e+0.9999),o=r-e>0.5?1:0,[a,i]=wt(e,He),[s,l]=wt(r,He);if(n===0)return`M${We},${We} L${a},${i} A${He},${He} 0 ${o} 1 ${s},${l} Z`;let[c,p]=wt(r,n),[d,h]=wt(e,n);return`M${a},${i} A${He},${He} 0 ${o} 1 ${s},${l} L${c},${p} A${n},${n} 0 ${o} 0 ${d},${h} Z`}function $c(e){if(e.length<=15)return e;return`${e.slice(0,14)}…`}function Hn(e,t){if(e==="Other")return"var(--hb-muted)";return K(t)}function Ko({spec:e}){let[t,n]=Ho(null),[r,o]=Ho(null),a=Bc(null),i=e.series[0].data,s=i.reduce((x,v)=>x+v,0),l=e.series[0].unit??e.unit,c=e.type==="donut",p=c?Wo:0,d=[],h=0;for(let x of i)d.push({start:h,end:h+x/s}),h+=x/s;let u=l==="%",b=i.indexOf(Math.max(...i)),m=u?{value:Kt(i[b]/s),label:String(e.x[b])}:{value:F(s,l),label:"Total"};function N(x){n(x);let v=a.current,C=v?.parentElement;if(x===null||!v||!C)return o(null);let[T,L]=wt((d[x].start+d[x].end)/2,c?(He+Wo)/2:He*0.6),R=v.getBoundingClientRect(),V=C.getBoundingClientRect(),j=String(e.x[x]);o({x:R.left-V.left+T,y:R.top-V.top+L,title:j,rows:[{colour:Hn(j,x),name:Ae(e.series,0),value:F(i[x],l,{full:!0})}],note:u?void 0:so(i,i[x])})}let y=(x)=>N(t===x?null:x),k=(x)=>t===null||t===x?1:0.5,S=(x)=>(v)=>v.pointerType==="mouse"&&N(x);return st("figure",{className:"hb-card hb-chart hb-pie",children:[re("figcaption",{className:"hb-chart-title",children:e.title??e.series[0].name??"Chart"}),!c&&st("div",{className:"hb-chart-figure",children:[re("span",{className:"hb-chart-big",children:m.value}),re("span",{className:"hb-chart-at",children:m.label})]}),st("div",{className:"hb-pie-body",children:[st("svg",{ref:a,width:vt,height:vt,viewBox:`0 0 ${vt} ${vt}`,className:"hb-pie-svg",role:"img","aria-label":e.title??"chart",...rt(i.length,t,N),children:[d.map((x,v)=>re("path",{d:Ac(x.start,x.end,p),fill:Hn(String(e.x[v]),v),opacity:k(v),className:"hb-slice",onClick:()=>y(v),onPointerEnter:S(v),onPointerLeave:S(null)},v)),c&&st("g",{textAnchor:"middle",pointerEvents:"none",children:[re("text",{x:We,y:We-2,className:"hb-pie-total",children:m.value}),re("text",{x:We,y:We+15,className:"hb-chart-axis",children:$c(m.label)})]})]}),re("table",{className:"hb-pie-legend",children:re("tbody",{children:i.map((x,v)=>st("tr",{onClick:()=>y(v),onPointerEnter:S(v),onPointerLeave:S(null),style:{opacity:k(v)},children:[re("td",{className:"hb-pie-swatch",children:re("i",{style:{background:Hn(String(e.x[v]),v)}})}),re("td",{className:"hb-pie-name",children:e.x[v]}),!u&&re("td",{className:"hb-pie-value",children:F(x,l)}),re("td",{className:"hb-pie-share",children:Kt(x/s)})]},v))})}),re(at,{tip:r})]}),e.source&&re("div",{className:"hb-chart-source",children:e.source})]})}import{jsx as q,jsxs as $e,Fragment as Pc}from"react/jsx-runtime";var Fc=60;function Jt({spec:e}){if(e.type==="pie"||e.type==="donut")return q(Ko,{spec:e});if(no(e)==="hbar")return q(_o,{spec:e});return q(Ic,{spec:e})}function Ic({spec:e}){let t=Vo(null),n=Vo(null),r=ke(t),[o,a]=Ec(null),i=Lc().replace(/[^a-zA-Z0-9]/g,""),s=e.x.length,l=e.type==="stacked"||e.type==="area",c=Zt(()=>l?ao(e.series,s):null,[e,s,l]),p=Zt(()=>lo(e,c),[e,c]),d=Zt(()=>Mo(e,r,p),[e,r,p]),h=Zt(()=>o===null?null:Ao(e,o,d),[e,o,d]);function u(N){let y=n.current?.getBoundingClientRect();if(!y||!y.width)return;let k=(N.clientX-y.left)/y.width*d.W,S=0;for(let x=1;x<s;x++)if(Math.abs(d.xAt(x)-k)<Math.abs(d.xAt(S)-k))S=x;a(S)}let b=e.type==="combo"||e.type==="bar"&&e.series.length>1||e.type==="line"&&e.series.length>1,m=e.type==="line"&&s>=Fc;return $e("figure",{className:`hb-card hb-chart${m?" hb-chart-wide":""}`,children:[q(zc,{spec:e,hover:o}),$e("div",{ref:t,className:"hb-chart-plot",children:[$e("svg",{ref:n,width:"100%",height:d.H,viewBox:`0 0 ${d.W} ${d.H}`,className:"hb-chart-svg",role:"img","aria-label":e.title??"chart",...rt(s,o,a),onPointerDown:u,onPointerMove:(N)=>(N.buttons||N.pointerType==="mouse")&&u(N),onPointerLeave:()=>a(null),children:[q(Rc,{spec:e,layout:d}),e.type==="line"&&q(Lo,{spec:e,layout:d,gid:i,hover:o}),e.type==="bar"&&q(Fo,{spec:e,layout:d,hover:o}),e.type==="stacked"&&c&&q(Io,{bands:c,layout:d,hover:o}),e.type==="area"&&c&&q(Ro,{bands:c,layout:d}),e.type==="combo"&&q(zo,{spec:e,layout:d,hover:o}),(e.type==="area"||e.type==="combo")&&o!==null&&q(On,{layout:d,at:o})]}),q(at,{tip:h})]}),b&&q(yt,{series:e.series}),l&&e.series.length>1&&q(yt,{series:e.series,at:o??Go(e),unit:e.unit}),e.source&&q("div",{className:"hb-chart-source",children:e.source})]})}function Go(e){let{last:t}=nt(e.series[0].data);return t<0?e.x.length-1:t}function zc({spec:e,hover:t}){let n=e.type==="stacked"||e.type==="area",r=e.type==="line"?ro(e.series[0].data):null,o=t??Go(e),a=n?io(e.series,o):e.series[0].data[o]??null,i=n?e.unit:e.series[0].unit??e.unit,s=n?[]:e.series.slice(1),l=e.figure!==!1;return $e(Pc,{children:[$e("figcaption",{className:"hb-chart-head",children:[q("span",{className:"hb-chart-title",children:e.title??e.series[0].name??"Chart"}),r!==null&&l&&$e("span",{className:`hb-chip ${r>=0?"hb-chip-good":"hb-chip-warn"}`,children:[r>=0?"▲":"▼"," ",Math.abs(r).toFixed(1),"%"]})]}),l&&$e("div",{className:"hb-chart-figure",children:[q("span",{className:"hb-chart-big",children:a===null?"–":F(a,i)}),$e("span",{className:"hb-chart-at",children:[t!==null?e.x[o]:"",s.map((c,p)=>{let d=c.data[o]??null;return d===null?null:$e("span",{className:"hb-chart-other",children:[c.name?`${c.name} `:"",F(d,c.unit??e.unit)]},p)})]})]})]})}function Rc({spec:e,layout:t}){let n=e.x.length-1,r=(o)=>t.slotted?"middle":o===0&&n>0?"start":o===n&&n>0?"end":"middle";return q("g",{children:t.xLabels.map((o)=>q("text",{x:t.xAt(o),y:t.H-7,textAnchor:r(o),className:"hb-chart-axis",children:String(e.x[o])},o))})}import{jsx as oe,jsxs as Nt}from"react/jsx-runtime";function Xo({title:e,inputs:t,outputs:n,chart:r}){let[o,a]=Dc(()=>new Map(t.map((l)=>[l.id,l.value]))),i=(l,c)=>a((p)=>new Map(p).set(l,c)),s=Oc(()=>r?ko(r,o):null,[r,o]);return Nt("div",{className:"hb-card hb-calc",children:[e&&oe("div",{className:"hb-card-title",children:oe(E,{text:e})}),t.map((l)=>oe(Wn,{input:l,value:o.get(l.id)??l.value,onMove:(c)=>i(l.id,c)},l.id)),n.length>0&&oe("div",{className:"hb-calc-results",children:n.map((l,c)=>oe(_c,{output:l,values:o},c))}),s&&oe(Jt,{spec:s})]})}function Wn({input:e,value:t,onMove:n}){return Nt("label",{className:"hb-calc-slider",children:[Nt("span",{className:"hb-calc-head",children:[oe("span",{className:"hb-calc-label",children:oe(E,{text:e.label})}),oe("span",{className:"hb-calc-value",children:Be(t,e.unit)})]}),oe("input",{type:"range",className:"hb-range",min:e.min,max:e.max,step:e.step,value:t,onChange:(r)=>n(Number(r.target.value))}),Nt("span",{className:"hb-calc-ends",children:[oe("span",{children:Be(e.min,e.unit)}),oe("span",{children:Be(e.max,e.unit)})]})]})}function _c({output:e,values:t}){let n=Ue(e.formula,t);return Nt("div",{className:"hb-calc-result",children:[oe("div",{className:"hb-calc-result-label",children:oe(E,{text:e.label})}),oe("div",{className:"hb-calc-result-value","aria-live":"polite",children:n===null?"–":Be(n,e.unit)})]})}var Hc=6,Wc=6,Kc=/^[A-Za-z_][A-Za-z0-9_]{0,23}$/;function Uo(e,t){let n=[];if((I([e.inputs,e.sliders])??[]).forEach((p,d)=>{let h=t.at("inputs").at(d),u=Kn(p,h);if(!u)return;if(n.some((b)=>b.id===u.id)){h.drop(`input id "${u.id}" is used twice`);return}n.push(u)}),!n.length)return t.drop("calculator has no usable input");let o=B(n,Hc,t,"inputs"),a=o.map((p)=>p.id),i=[];(I([e.outputs,e.results])??[]).forEach((p,d)=>{let h=Vc(p,a,t.at("outputs").at(d));if(h)i.push(h)});let l=f([e.title],80),c=e.chart===void 0?void 0:yo(e.chart,a,t.at("chart"));return w({type:"calculator",title:l,inputs:o,outputs:B(i,Wc,t,"outputs"),chart:c})}function Kn(e,t){if(!e||typeof e!=="object")return t.drop("input is not an object");let n=f([e.id,e.name,e.key],24);if(!n||!Kc.test(n)||_e(n))return t.drop(`input needs an id like "p" or "rate" (got ${JSON.stringify(n??null)})`);let r=f([e.label,e.title],40)??n,o=M(e.value)??M(e.default),a=M(e.min)??0,i=M(e.max)??Gc(o);if(i<=a)return t.drop("input's max must be above its min");let s=Xc(M(e.step))??Vn((i-a)/100),l=Math.min(i,Math.max(a,o??a));return w({id:n,label:r,min:a,max:i,step:s,value:l,unit:f([e.unit],12)})}function Vc(e,t,n){if(!e||typeof e!=="object")return n.drop("output is not an object");let r=f([e.label,e.title,e.name],40),o=f([e.formula,e.expr,e.value],300);if(!r||!o)return n.drop("output needs a label and a formula");try{let a=xe(ye(o)).filter((i)=>!t.includes(i));if(a.length)n.drop(`formula uses ${a.join(", ")}, which no input has; shows –`)}catch(a){n.drop(`formula can't be read (${a.message}); shows –`)}return w({label:r,formula:o,unit:f([e.unit],12)})}function Gc(e){if(e!==null&&e>0)return e*2;return 100}function Xc(e){if(e!==null&&e>0)return e;return null}function Vn(e){let t=10**Math.floor(Math.log10(e)),n=e/t;if(n<1.5)return t;if(n<3.5)return 2*t;if(n<7.5)return 5*t;return 10*t}import{useContext as Uc}from"react";import{jsx as ee,jsxs as Ke}from"react/jsx-runtime";var Qt=(e)=>{let[t,n,r]=e.split("-").map(Number);return new Date(t,n-1,r)},Gn=(e,t)=>e.toDateString()===t.toDateString();function jc(e,t){let n=Qt(e);if(Gn(n,t))return"Today";let r=new Date(t.getFullYear(),t.getMonth(),t.getDate()+1);if(Gn(n,r))return"Tomorrow";let o=(n.getTime()-new Date(t.getFullYear(),t.getMonth(),t.getDate()).getTime())/86400000;if(o>0&&o<7)return n.toLocaleDateString("en-GB",{weekday:"long"});return`${n.toLocaleDateString("en-GB",{weekday:"short"})} ${n.getDate()} `+n.toLocaleDateString("en-GB",{month:"short"})}function Yc(e,t,n){if(!Gn(Qt(t),n))return e[0];let r=`${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`;return e.find((o)=>(o.end??o.start)>r)??e.at(-1)}function jo({date:e,title:t,events:n,week:r,ask:o}){let{fill:a}=Uc(_),i=new Date,s=Qt(e),l=Yc(n,e,i);return Ke("div",{className:"hb-card hb-cal",children:[Ke("div",{className:"hb-cal-date",children:[ee("span",{className:"hb-cal-weekday",children:s.toLocaleDateString("en-GB",{weekday:"long"})}),ee("span",{className:"hb-cal-day",children:s.getDate()}),ee("span",{className:"hb-cal-month",children:s.toLocaleDateString("en-GB",{month:"long",year:"numeric"})})]}),Ke("div",{className:"hb-cal-mid",children:[Ke("div",{className:"hb-cal-next-row",children:[t&&ee("span",{className:"hb-cal-title",children:t}),l&&Ke("span",{className:"hb-cal-next",children:[ee("span",{className:"hb-cal-next-when",children:jc(e,i)}),ee("span",{className:"hb-cal-next-time",children:l.end?`${l.start}–${l.end}`:l.start}),ee("span",{className:"hb-cal-next-title",children:l.title})]}),o&&Ke("button",{type:"button",className:"hb-cal-ask",onClick:()=>a(o),children:[ee(D,{name:"spark",size:14})," Ask about it"]})]}),n.length?ee("ul",{className:"hb-cal-events",children:n.map((c,p)=>Ke("li",{title:c.place,children:[ee("span",{className:"hb-cal-event-time",children:c.start}),ee("span",{className:"hb-cal-event-title",children:c.title})]},p))}):ee("div",{className:"hb-cal-empty",children:"Nothing planned"})]}),r.length>0&&ee("ul",{className:"hb-cal-week","aria-label":"This week",children:r.map((c)=>{let p=Qt(c.date),d=[c.date===e?"is-selected":"",c.count>0?"has-events":""].filter(Boolean).join(" ");return Ke("li",{className:d,"aria-label":`${p.toLocaleDateString("en-GB",{weekday:"long",day:"numeric"})}: ${c.count} events`,children:[ee("span",{children:p.toLocaleDateString("en-GB",{weekday:"narrow"})}),ee("b",{children:p.getDate()}),ee("i",{"aria-hidden":"true"})]},c.date)})})]})}var qc=/^\d{4}-\d{2}-\d{2}$/;function Yo(e){let t=f([e],40);if(!t)return;let n=/(?:T|^)(\d{1,2}):(\d{2})/.exec(t);return n?`${n[1].padStart(2,"0")}:${n[2]}`:void 0}var qo=(e)=>{let t=f([e],40)?.slice(0,10);return t&&qc.test(t)?t:void 0};function Zo(e,t){let n=qo(e.date??e.day);if(!n)return t.drop("calendar needs date as YYYY-MM-DD");let r=[];(I([e.events,e.items])??[]).forEach((a,i)=>{let s=f([a?.title,a?.name],80),l=Yo(a?.start??a?.time);if(!s||!l){t.at("events").at(i).drop("event needs a title and a start");return}r.push(w({title:s,start:l,end:Yo(a?.end),place:f([a?.place,a?.location],60)}))});let o=[];return(I([e.week])??[]).forEach((a)=>{let i=qo(a?.date);if(i)o.push({date:i,count:Math.max(0,M(a?.count)??0)})}),w({type:"calendar",date:n,title:f([e.title],60),events:B(r.sort((a,i)=>a.start.localeCompare(i.start)),12,t,"events"),week:B(o,7,t,"week"),ask:f([e.ask],120)})}import{jsx as lt,jsxs as Jo}from"react/jsx-runtime";var Zc={info:"info",tip:"spark",warn:"alert"};function Qo({tone:e,title:t,text:n}){return Jo("div",{className:`hb-callout hb-callout-${e}`,children:[lt("span",{className:"hb-callout-icon",children:lt(D,{name:Zc[e],size:17,stroke:2.2})}),Jo("div",{className:"hb-callout-body",children:[t&&lt("div",{className:"hb-callout-title",children:lt(E,{text:t})}),lt("div",{children:lt(E,{text:n})})]})]})}import{useContext as ep}from"react";import{useId as Jc}from"react";import{jsx as g,jsxs as O}from"react/jsx-runtime";var en={medical:{day:["#d9f4ee","#c4e2f4"],night:["#12403f","#183a5c"]},meeting:{day:["#e4e7ff","#ccd6ff"],night:["#23285e","#2e2f72"]},call:{day:["#dcebff","#cbe3ff"],night:["#173a63","#1c4f7a"]},birthday:{day:["#ffe2ea","#ffd6bd"],night:["#5a2236","#6b3426"]},celebration:{day:["#ffe6f1","#e8daff"],night:["#4f2347","#3a2a6b"]},travel:{day:["#d8edff","#ffe6cc"],night:["#173a63","#5b3a24"]},meal:{day:["#ffecd8","#ffd9c4"],night:["#5a3320","#5a2a2a"]},fitness:{day:["#e0f6e3","#cdeef0"],night:["#164a35","#154548"]},card:{day:["#ece6ff","#fbe1ea"],night:["#34296b","#5a2440"]},bill:{day:["#efe9ff","#e2ecff"],night:["#2f2a66","#23366b"]},insurance:{day:["#dff2eb","#e6ecff"],night:["#144636","#263a66"]},delivery:{day:["#fff0d6","#f4e1c8"],night:["#4f3a18","#4a3423"]},school:{day:["#fff4cc","#e0eeff"],night:["#4d4314","#1f3b63"]},show:{day:["#f3dcff","#ffd8e8"],night:["#4a2268","#5c2242"]},general:{day:["#eef0f6","#e5e0f5"],night:["#2a2d3e","#332c4a"]}};function ea(e){let t=en[e]??en.general;return{"--ka":t.day[0],"--kb":t.day[1],"--kda":t.night[0],"--kdb":t.night[1]}}function ta({kind:e,size:t=120}){let n=Jc().replace(/[^a-zA-Z0-9]/g,""),r=(o)=>`url(#${n}${o})`;return O("svg",{width:t,height:t,viewBox:"0 0 120 120","aria-hidden":"true",children:[O("defs",{children:[O("linearGradient",{id:`${n}a`,x1:"0",y1:"0",x2:"1",y2:"1",children:[g("stop",{offset:"0",stopColor:"#ffffff"}),g("stop",{offset:"1",stopColor:"#dfe3ee"})]}),O("linearGradient",{id:`${n}teal`,x1:"0",y1:"0",x2:"1",y2:"1",children:[g("stop",{offset:"0",stopColor:"#5fd3c4"}),g("stop",{offset:"1",stopColor:"#2a8fb0"})]}),O("linearGradient",{id:`${n}metal`,x1:"0",y1:"0",x2:"1",y2:"1",children:[g("stop",{offset:"0",stopColor:"#f4f6fa"}),g("stop",{offset:".5",stopColor:"#b9c1cf"}),g("stop",{offset:"1",stopColor:"#7f8898"})]}),O("linearGradient",{id:`${n}navy`,x1:"0",y1:"0",x2:"0",y2:"1",children:[g("stop",{offset:"0",stopColor:"#5a6ad8"}),g("stop",{offset:"1",stopColor:"#2f3a8f"})]}),O("linearGradient",{id:`${n}pink`,x1:"0",y1:"0",x2:"0",y2:"1",children:[g("stop",{offset:"0",stopColor:"#ffb6c8"}),g("stop",{offset:"1",stopColor:"#f07a9b"})]}),O("linearGradient",{id:`${n}cream`,x1:"0",y1:"0",x2:"0",y2:"1",children:[g("stop",{offset:"0",stopColor:"#fff6e6"}),g("stop",{offset:"1",stopColor:"#f6dcb8"})]}),O("linearGradient",{id:`${n}gold`,x1:"0",y1:"0",x2:"1",y2:"1",children:[g("stop",{offset:"0",stopColor:"#ffe08a"}),g("stop",{offset:"1",stopColor:"#f2a33a"})]}),O("linearGradient",{id:`${n}sky`,x1:"0",y1:"0",x2:"1",y2:"1",children:[g("stop",{offset:"0",stopColor:"#7cc4ff"}),g("stop",{offset:"1",stopColor:"#3f7de0"})]}),O("linearGradient",{id:`${n}violet`,x1:"0",y1:"0",x2:"1",y2:"1",children:[g("stop",{offset:"0",stopColor:"#b7a3ff"}),g("stop",{offset:"1",stopColor:"#6f5ae6"})]}),O("linearGradient",{id:`${n}green`,x1:"0",y1:"0",x2:"1",y2:"1",children:[g("stop",{offset:"0",stopColor:"#8be0a4"}),g("stop",{offset:"1",stopColor:"#2fae86"})]}),O("linearGradient",{id:`${n}kraft`,x1:"0",y1:"0",x2:"1",y2:"1",children:[g("stop",{offset:"0",stopColor:"#e9c592"}),g("stop",{offset:"1",stopColor:"#c08a52"})]}),O("linearGradient",{id:`${n}coral`,x1:"0",y1:"0",x2:"1",y2:"1",children:[g("stop",{offset:"0",stopColor:"#ffb08a"}),g("stop",{offset:"1",stopColor:"#f0636b"})]})]}),g("ellipse",{cx:"60",cy:"108",rx:"34",ry:"5",fill:"rgba(40,30,60,.12)"}),Qc(e,r)]})}function Qc(e,t){switch(e){case"medical":return O("g",{children:[g("path",{d:"M36 18 C30 40 34 56 52 60 C70 56 74 40 68 18",fill:"none",stroke:t("teal"),strokeWidth:"6",strokeLinecap:"round"}),g("circle",{cx:"36",cy:"16",r:"5",fill:t("metal")}),g("circle",{cx:"68",cy:"16",r:"5",fill:t("metal")}),g("path",{d:"M52 60 C52 76 58 88 76 88",fill:"none",stroke:t("teal"),strokeWidth:"6",strokeLinecap:"round"}),g("circle",{cx:"84",cy:"86",r:"14",fill:t("metal")}),g("circle",{cx:"84",cy:"86",r:"8",fill:"#dfe6ef",stroke:"#9aa4b4",strokeWidth:"1.5"}),g("circle",{cx:"80",cy:"82",r:"2.5",fill:"#fff",opacity:".9"})]});case"meeting":return O("g",{children:[g("rect",{x:"46",y:"22",width:"28",height:"16",rx:"6",fill:"none",stroke:"#3a4594",strokeWidth:"5"}),g("rect",{x:"20",y:"34",width:"80",height:"58",rx:"12",fill:t("navy")}),g("rect",{x:"20",y:"34",width:"80",height:"22",rx:"12",fill:"#6c7ce6",opacity:".55"}),g("rect",{x:"53",y:"52",width:"14",height:"12",rx:"3",fill:t("gold")}),g("path",{d:"M26 40 h68",stroke:"#fff",strokeOpacity:".35",strokeWidth:"2",strokeLinecap:"round"})]});case"call":return O("g",{children:[g("rect",{x:"16",y:"36",width:"64",height:"48",rx:"12",fill:t("sky")}),g("path",{d:"M80 52 L104 38 V82 L80 68 Z",fill:"#2f63c4"}),g("circle",{cx:"34",cy:"50",r:"5",fill:"#fff",opacity:".85"}),g("path",{d:"M24 44 h22",stroke:"#fff",strokeOpacity:".4",strokeWidth:"2",strokeLinecap:"round"})]});case"birthday":return O("g",{children:[g("rect",{x:"26",y:"66",width:"68",height:"30",rx:"8",fill:t("pink")}),g("path",{d:"M26 72 q8 8 17 0 t17 0 t17 0 t17 0",fill:"#fff4f7"}),g("rect",{x:"36",y:"44",width:"48",height:"24",rx:"7",fill:t("cream")}),g("path",{d:"M36 50 q6 6 12 0 t12 0 t12 0 t12 0",fill:"#fff"}),[48,60,72].map((n)=>O("g",{children:[g("rect",{x:n-2.5,y:"28",width:"5",height:"16",rx:"2",fill:n===60?"#7cc4ff":"#b7a3ff"}),g("path",{d:`M${n} 18 q4 5 0 9 q-4 -4 0 -9`,fill:t("gold")})]},n)),O("g",{transform:"translate(96 32)",children:[[0,72,144,216,288].map((n)=>g("ellipse",{cx:"0",cy:"-7",rx:"4.5",ry:"7",fill:"#ff8fb0",transform:`rotate(${n})`},n)),g("circle",{r:"4",fill:t("gold")})]})]});case"celebration":return O("g",{children:[g("rect",{x:"24",y:"50",width:"72",height:"46",rx:"8",fill:t("violet")}),g("rect",{x:"20",y:"38",width:"80",height:"18",rx:"6",fill:"#9b86f5"}),g("rect",{x:"55",y:"38",width:"10",height:"58",fill:t("gold")}),g("path",{d:"M60 38 C44 18 30 30 46 38 Z M60 38 C76 18 90 30 74 38 Z",fill:t("gold")})]});case"travel":return O("g",{children:[g("path",{d:"M20 86 a14 14 0 0 1 22 -12 a18 18 0 0 1 34 4 a12 12 0 0 1 4 24 H26 a12 12 0 0 1 -6 -16 z",fill:"#ffffff",opacity:".95"}),O("g",{transform:"rotate(-18 60 46)",children:[g("path",{d:"M14 50 C40 44 80 44 104 48 C110 50 110 54 104 56 C80 60 40 60 14 54 Z",fill:t("sky")}),g("path",{d:"M54 50 L40 24 L50 24 L74 50 Z M54 56 L44 76 L54 76 L72 56 Z",fill:"#2f63c4"}),g("path",{d:"M18 50 L10 38 L18 38 L28 50 Z",fill:"#2f63c4"}),[66,74,82,90].map((n)=>g("circle",{cx:n,cy:"50",r:"2",fill:"#fff"},n))]})]});case"meal":return O("g",{children:[g("path",{d:"M28 50 h56 v26 a22 22 0 0 1 -22 22 h-12 a22 22 0 0 1 -22 -22 z",fill:t("coral")}),g("path",{d:"M84 56 a12 12 0 0 1 0 24",fill:"none",stroke:"#e5556a",strokeWidth:"6"}),g("ellipse",{cx:"56",cy:"50",rx:"28",ry:"5",fill:"#7a3b2a",opacity:".8"}),[44,56,68].map((n)=>g("path",{d:`M${n} 40 q-6 -8 0 -14 q6 -6 0 -14`,fill:"none",stroke:"#c9b6d8",strokeWidth:"3",strokeLinecap:"round"},n))]});case"fitness":return O("g",{transform:"rotate(-20 60 60)",children:[g("rect",{x:"34",y:"56",width:"52",height:"8",rx:"4",fill:t("metal")}),g("rect",{x:"18",y:"40",width:"16",height:"40",rx:"5",fill:t("green")}),g("rect",{x:"86",y:"40",width:"16",height:"40",rx:"5",fill:t("green")}),g("rect",{x:"10",y:"48",width:"10",height:"24",rx:"4",fill:"#2a9e7b"}),g("rect",{x:"100",y:"48",width:"10",height:"24",rx:"4",fill:"#2a9e7b"})]});case"card":return O("g",{children:[g("path",{d:"M58 16 h36 v70 l-6 -4 l-6 4 l-6 -4 l-6 4 l-6 -4 l-6 4 z",fill:"#fff",stroke:"#e3dcf2"}),[30,40,50].map((n)=>g("path",{d:`M64 ${n} h24`,stroke:"#c9c1e0",strokeWidth:"3",strokeLinecap:"round"},n)),O("g",{transform:"rotate(-12 50 70)",children:[g("rect",{x:"12",y:"50",width:"78",height:"48",rx:"9",fill:t("violet")}),g("rect",{x:"12",y:"62",width:"78",height:"9",fill:"#4a3bb0",opacity:".7"}),g("rect",{x:"22",y:"78",width:"16",height:"11",rx:"2.5",fill:t("gold")}),g("path",{d:"M56 86 h24",stroke:"#fff",strokeOpacity:".7",strokeWidth:"3",strokeLinecap:"round"})]})]});case"bill":return O("g",{children:[g("path",{d:"M30 14 h60 v84 l-7.5 -6 l-7.5 6 l-7.5 -6 l-7.5 6 l-7.5 -6 l-7.5 6 l-7.5 -6 l-7.5 6 z",fill:"#fff",stroke:"#dfe3f0"}),g("circle",{cx:"60",cy:"40",r:"15",fill:t("violet")}),g("path",{d:"M60 30 v20 M65 35.5 c0 -2.5 -2.2 -3.5 -5 -3.5 c-3 0 -5 1.5 -5 3.8 c0 5.7 10 2.7 10 8.4 c0 2.4 -2.2 3.8 -5 3.8 c-2.8 0 -5 -1.1 -5 -3.6",fill:"none",stroke:"#fff",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round"}),[64,72,80].map((n,r)=>g("path",{d:`M40 ${n} h${r===2?22:40}`,stroke:"#cfd4e6",strokeWidth:"3",strokeLinecap:"round"},n))]});case"insurance":return O("g",{children:[g("path",{d:"M60 14 L94 26 V54 C94 78 78 94 60 102 C42 94 26 78 26 54 V26 Z",fill:t("green")}),g("path",{d:"M60 22 L86 31 V54 C86 73 74 86 60 93 Z",fill:"#fff",opacity:".18"}),g("path",{d:"M44 58 L56 70 L78 46",fill:"none",stroke:"#fff",strokeWidth:"7",strokeLinecap:"round",strokeLinejoin:"round"})]});case"delivery":return O("g",{children:[g("path",{d:"M60 18 L100 36 V82 L60 100 L20 82 V36 Z",fill:t("kraft")}),g("path",{d:"M20 36 L60 54 L100 36",fill:"none",stroke:"#a86f3a",strokeWidth:"2"}),g("path",{d:"M60 54 V100",stroke:"#a86f3a",strokeWidth:"2"}),g("path",{d:"M40 27 L80 45 V60 L72 56 V49 L33 31 Z",fill:"#f6e2bf"})]});case"school":return O("g",{children:[g("path",{d:"M60 24 L108 44 L60 64 L12 44 Z",fill:t("navy")}),g("path",{d:"M32 54 V76 C32 84 88 84 88 76 V54 L60 66 Z",fill:"#3a4594"}),g("path",{d:"M100 47 V74",stroke:t("gold"),strokeWidth:"3"}),g("circle",{cx:"100",cy:"78",r:"5",fill:t("gold")})]});case"show":return O("g",{transform:"rotate(-10 60 60)",children:[g("path",{d:"M14 36 h92 v14 a10 10 0 0 0 0 20 v14 h-92 v-14 a10 10 0 0 0 0 -20 z",fill:t("coral")}),g("path",{d:"M78 38 v44",stroke:"#fff",strokeOpacity:".7",strokeWidth:"2.5",strokeDasharray:"4 5"}),g("path",{d:"M30 52 h36 M30 64 h24",stroke:"#fff",strokeOpacity:".85",strokeWidth:"4",strokeLinecap:"round"}),g("path",{d:"M92 52 l3 6 6 1 -4.5 4 1 6 -5.5 -3 -5.5 3 1 -6 -4.5 -4 6 -1 z",fill:t("gold")})]});default:return O("g",{children:[g("rect",{x:"22",y:"24",width:"76",height:"74",rx:"14",fill:"#fff",stroke:"#e1e4ef"}),g("path",{d:"M22 38 a14 14 0 0 1 14 -14 h48 a14 14 0 0 1 14 14 v8 h-76 z",fill:t("coral")}),g("rect",{x:"38",y:"16",width:"6",height:"16",rx:"3",fill:"#8a91a6"}),g("rect",{x:"76",y:"16",width:"6",height:"16",rx:"3",fill:"#8a91a6"}),[0,1,2].map((n)=>[0,1,2,3].map((r)=>g("rect",{x:34+r*14,y:56+n*12,width:"8",height:"6",rx:"2",fill:n===1&&r===2?"#f0636b":"#d8dceb"},`${n}${r}`)))]})}}import{jsx as we,jsxs as Ct}from"react/jsx-runtime";var tp=(e)=>{let[t,n,r]=e.split("-").map(Number);return new Date(t,n-1,r)};function np({item:e,compact:t}){let{fill:n}=ep(_),r=tp(e.date);return Ct("button",{type:"button",className:"hb-up-card",style:ea(e.kind),onClick:()=>n(e.ask??`Tell me about ${e.title}`),children:[Ct("span",{className:"hb-up-top",children:[Ct("span",{children:[Ct("span",{className:"hb-up-weekday",children:[r.toLocaleDateString("en-GB",{weekday:"short"}),e.source&&we("span",{className:"hb-up-source",title:e.source==="mail"?"From mail":"From calendar",children:we(D,{name:e.source==="mail"?"mail":"cal",size:11,stroke:2.4})})]}),we("span",{className:"hb-up-day",children:r.getDate()})]}),we(ta,{kind:e.kind,size:t?36:56})]}),we("span",{className:"hb-up-title",children:e.title}),e.state&&e.stateText&&we("span",{className:`hb-up-state hb-up-state-${e.state}`,children:e.stateText}),(e.time||e.amount)&&we("span",{className:"hb-up-meta",children:e.time??e.amount})]})}function na({title:e,items:t,compact:n}){return Ct("div",{className:"hb-up",children:[e&&we("div",{className:"hb-up-heading",children:e}),we("div",{className:n?"hb-up-row hb-up-compact":"hb-up-row",children:t.map((r,o)=>we(np,{item:r,compact:n},o))})]})}var rp=["overdue","today","soon"],op={flight:"travel",trip:"travel",train:"travel",appointment:"medical",dentist:"medical",doctor:"medical",order:"delivery",package:"delivery",parcel:"delivery",shopping:"delivery",payment:"bill",invoice:"bill",dinner:"meal",lunch:"meal",brunch:"meal",gym:"fitness",workout:"fitness",run:"fitness",wedding:"celebration",party:"celebration",concert:"show",event:"show",class:"school"};function ap(e){let t=f([e],30)?.toLowerCase()??"";if(t in en)return t;return op[t]??"general"}function ra(e,t){let n=[];if((I([e.items,e.events])??[]).forEach((r,o)=>{let a=f([r?.date],40)?.slice(0,10),i=f([r?.title,r?.name],80);if(!a||!/^\d{4}-\d{2}-\d{2}$/.test(a)||!i){t.at("items").at(o).drop("item needs a date and a title");return}let s=r?.source==="mail"||r?.source==="calendar"?r.source:void 0,l=rp.includes(r?.state)?r.state:void 0;n.push(w({date:a,title:i,kind:ap(r?.kind),time:f([r?.time],20),amount:Oe([r?.amount],20),source:s,ask:f([r?.ask],160),state:l,stateText:l?f([r?.stateText],40):void 0}))}),!n.length)return t.drop("upnext has no item with a date and a title");return w({type:"upnext",title:f([e.title],60),items:B(n,12,t,"items"),compact:e.compact===!0?!0:void 0})}import{jsx as Un,jsxs as oa}from"react/jsx-runtime";var Xn=(e)=>`${Math.round(e)}°`;function aa({temp:e,place:t,condition:n,high:r,low:o}){let a=[r!==void 0?`High ${Xn(r)}`:null,o!==void 0?`${Xn(o)} tonight`:null].filter(Boolean).join(" · ");return oa("div",{className:"hb-card hb-weather",children:[Un("span",{className:"hb-weather-temp",children:Xn(e)}),oa("span",{className:"hb-weather-text",children:[Un("span",{className:"hb-weather-where",children:n?`${n} in ${t}`:t}),a&&Un("span",{className:"hb-weather-range",children:a})]})]})}function ia(e,t){let n=M(e.temp),r=f([e.place,e.city],80);if(n===null||!r)return t.drop("weather needs a temp and a place"),null;return w({type:"weather",temp:n,place:r,condition:f([e.condition,e.sky],40),high:M(e.high)??void 0,low:M(e.low)??void 0})}var ip={info:"info",note:"info",neutral:"info",tip:"tip",success:"tip",good:"tip",idea:"tip",warn:"warn",warning:"warn",caution:"warn",danger:"warn",alert:"warn",error:"warn"};function sa(e,t){let n=f([e.tone,e.variant],20)?.toLowerCase()??"info",r=ip[n]??"info",o=f([e.title],80),a=pe([e.text,e.body,e.message,e.content],400);if(!a&&o)a=o,o=void 0;if(!a)return t.drop("callout needs text");return w({type:"callout",tone:r,title:o,text:a})}function la(e,t){let n=sp(e);if(!n)return t.drop("chart needs x labels and at least one series");return{type:"chart",spec:n}}function sp(e){if(!Array.isArray(e.x)||!Array.isArray(e.series)||!e.series.length)return null;let t=Wt(e.kind),n=typeof e.unit==="string"?e.unit:void 0,r=e.x.map(String),o=e.series.filter((i)=>i&&Array.isArray(i.data)).slice(0,eo(t)).map((i,s)=>lp(i,s,t,n));if(!o.length||o.every((i)=>i.data.every((s)=>s===null)))return null;if(t==="pie"||t==="donut"){let i=oo(r,o[0].data);if(!i.x.length)return null;r=i.x,o=[{...o[0],data:i.data}]}let a={type:t,title:typeof e.title==="string"?e.title:void 0,x:r,series:o,unit:n,source:typeof e.source==="string"?e.source:void 0};if(typeof e.figure==="boolean")a.figure=e.figure;if(e.tone==="change")a.tone="change";return a}function lp(e,t,n,r){let o=typeof e.name==="string"?e.name:void 0,a=e.data.map((l)=>typeof l==="number"&&isFinite(l)?l:null),i=typeof e.unit==="string"?e.unit:void 0,s=to(n,t,i,e.axis,r);return{name:o,data:a,unit:i,right:s}}import{useContext as pp,useEffect as dp,useRef as ua,useState as up}from"react";var tn=new Map;function cp(e){let t=e?.state;if(t&&typeof t==="object"&&!Array.isArray(t))return{...t};return{}}function St(e,t){let n=tn.get(t);if(n)return n.loaded;let r={state:{},loaded:Promise.resolve({}),saving:Promise.resolve()};return r.loaded=e(`/blocks/${t}/state`).then((o)=>(r.state=cp(o),r.state),()=>(tn.delete(t),{})),tn.set(t,r),r.loaded}async function nn(e,t,n,r){await St(e,t);let o=tn.get(t);if(!o)return;o.state={...o.state,[n]:r};let a=o.state;o.saving=o.saving.then(()=>e(`/blocks/${t}/state`,{method:"PUT",body:{state:a}})).then(()=>{},()=>{}),await o.saving}function ca(e,t){if(e.includes(t))return e.filter((n)=>n!==t);return[...e,t].sort((n,r)=>n-r)}function pa(e,t){if(!Array.isArray(e))return null;let n=new Set;for(let r of e)if(Number.isInteger(r)&&r>=0&&r<t)n.add(r);return[...n].sort((r,o)=>r-o)}function da(e,t,n){if(n)return t;return e??t}import{jsx as be,jsxs as rn}from"react/jsx-runtime";function ha({title:e,numbered:t,items:n,ticked:r,path:o}){let[a,i]=bp(o,r,n.length),s=a.length,l=s===n.length;return rn("div",{className:"hb-card hb-checklist",children:[rn("div",{className:"hb-checklist-head",children:[e&&be("span",{className:"hb-card-title",children:be(E,{text:e})}),be("span",{className:l?"hb-checklist-count hb-checklist-count-done":"hb-checklist-count","aria-live":"polite",children:l?"All done":`${s} of ${n.length} done`})]}),be("div",{className:"hb-checklist-track",children:be("span",{className:"hb-checklist-fill",style:{width:`${s/n.length*100}%`}})}),n.map((c,p)=>rn("div",{children:[hp(n,p)&&be("div",{className:"hb-checklist-group",children:be(E,{text:c.group})}),rn("button",{type:"button",role:"checkbox","aria-checked":a.includes(p),onClick:()=>i(p),className:a.includes(p)?"hb-check hb-check-on":"hb-check",children:[be("span",{className:"hb-check-mark",children:a.includes(p)?be(D,{name:"check",size:13,stroke:3}):t?p+1:null}),be("span",{className:"hb-check-text",children:be(E,{text:c.text})})]})]},p))]})}function hp(e,t){let n=e[t].group;if(!n)return!1;return e[t-1]?.group!==n}function bp(e,t,n){let{rest:r,blockId:o}=pp(_),[a,i]=up(t),s=ua(t),l=ua(!1);s.current=a,dp(()=>{if(!r||!o)return;let p=!0;return St(r,o).then((d)=>{if(p)i(da(pa(d[e],n),s.current,l.current))}),()=>{p=!1}},[r,o,e,n]);function c(p){l.current=!0;let d=ca(s.current,p);if(s.current=d,i(d),r&&o)nn(r,o,e,d)}return[a,c]}var fp=40;function fa(e,t){let n=mp(e,t);if(!n.length)return t.drop("checklist has no item with text");let r=B(n,fp,t,"items"),o=[],a=[];r.forEach((l,c)=>{if(o.push(w({text:l.text,group:l.group,id:l.id})),l.done)a.push(c)});let i=e.numbered===!0||e.ordered===!0,s=f([e.title,e.label],80);return w({type:"checklist",title:s,numbered:i,items:o,ticked:a,path:t.path})}function mp(e,t){let n=[];return I([e.items,e.tasks,e.steps])?.forEach((a,i)=>{let s=ba(a,void 0);if(s)n.push(s);else t.at("items").at(i).drop("item has no text")}),(I([e.groups,e.sections])??[]).forEach((a,i)=>{let s=f([a?.label,a?.title,a?.name],60);(I([a?.items,a?.tasks])??[]).forEach((c,p)=>{let d=ba(c,s);if(d)n.push(d);else t.at("groups").at(i).at("items").at(p).drop("item has no text")})}),n}function ba(e,t){if(typeof e==="string"){let a=f([e],160);if(!a)return null;return{text:a,group:t,done:!1}}if(!e||typeof e!=="object")return null;let n=f([e.text,e.title,e.label,e.name],160);if(!n)return null;let r=f([e.group,e.section,e.category],60)??t,o=typeof e.id==="string"&&e.id.trim()?e.id.trim().slice(0,40):void 0;return{text:n,group:r,done:e.done===!0||e.checked===!0,id:o}}import{useState as ga}from"react";function ma(e){if(e<=4)return Math.max(1,e);let t=(n)=>e%n||n;return t(3)/3>t(4)/4?3:4}import{jsx as se,jsxs as Tt}from"react/jsx-runtime";function xa({title:e,cards:t}){let[n,r]=ga(()=>t.map(()=>!1)),o=(i)=>r((s)=>s.map((l,c)=>c===i?!l:l)),a=t.some((i)=>i.image);return Tt("div",{className:"hb-flip",children:[e&&se("div",{className:"hb-card-title",children:e}),se("div",{className:a?"hb-flip-grid hb-flip-tall":"hb-flip-grid",style:{"--hb-flip-cols":ma(t.length)},children:t.map((i,s)=>se(gp,{card:i,place:`${s+1} of ${t.length}`,turned:n[s]===!0,onTurn:()=>o(s)},s))})]})}function gp({card:e,place:t,turned:n,onTurn:r}){let[o,a]=ga(!1),i=e.image&&!o?e.image:void 0,s=n?`${e.front}: ${e.back}`:`${e.front}, tap to see the answer`;return se("button",{type:"button",className:"hb-flip-card",onClick:r,"aria-pressed":n,"aria-label":s,children:Tt("span",{className:n?"hb-flip-inner hb-flip-turned":"hb-flip-inner",children:[Tt("span",{className:"hb-flip-face hb-flip-front",children:[se("span",{className:"hb-flip-label",children:t}),se("span",{className:"hb-flip-question",children:se(E,{text:e.front})}),Tt("span",{className:"hb-flip-foot",children:[se("span",{children:"Tap to turn"}),se("span",{"aria-hidden":"true",children:"↻"})]})]}),Tt("span",{className:"hb-flip-face hb-flip-back",children:[i&&se("img",{src:i,alt:"",loading:"lazy",referrerPolicy:"no-referrer",onError:()=>a(!0)}),se("span",{className:"hb-flip-label",children:"Answer"}),se("span",{className:"hb-flip-answer",children:se(E,{text:e.back})})]})]})})}var xp=140,yp=260;function ya(e,t){let n=Array.isArray(e.cards)?e.cards:[],r=[];if(n.forEach((o,a)=>{let i=pe([o?.front,o?.question],xp),s=pe([o?.back,o?.answer],yp);if(!i||!s){t.at("cards").at(a).drop("card needs a front and a back");return}r.push(w({front:i,back:s,image:G(o.image)}))}),!r.length)return t.drop("flip has no cards");return w({type:"flip",title:A(e.title,60),cards:B(r,12,t,"cards")})}import{Fragment as kp,useId as vp,useLayoutEffect as wp,useMemo as Np,useRef as qn,useState as Na}from"react";function ct(){return typeof window.matchMedia==="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches}function va(e,t,n){let r=t.left>=e.right-1||e.left>=t.right-1,o=(s)=>({x:(s.left+s.right)/2,y:(s.top+s.bottom)/2});if(!n)return r?[{x:e.right,y:o(e).y},{x:t.left,y:o(e).y}]:[{x:o(e).x,y:e.bottom},{x:o(t).x,y:t.top}];if(r){let s={x:o(e).x,y:e.top},l={x:o(t).x,y:t.top};return ka(s,{x:(s.x+l.x)/2,y:Math.min(e.top,t.top)-40},l)}let a={x:e.right,y:o(e).y},i={x:t.right,y:o(t).y};return ka(a,{x:Math.max(e.right,t.right)+34,y:(a.y+i.y)/2},i)}function ka(e,t,n,r=16){return Array.from({length:r+1},(o,a)=>{let i=a/r,s=1-i;return{x:s*s*e.x+2*s*i*t.x+i*i*n.x,y:s*s*e.y+2*s*i*t.y+i*i*n.y}})}function jn(e,t,n,r){let o=e.map((p)=>p.holds??[]),a=(p)=>p===void 0?-1:e.findIndex((d)=>d.id===p),i=Yn(e,n),s=new Set,l=t.map(()=>0),c;for(let p of n.slice(0,r+1)){let d=a(p.node);if(d===0&&s.size)s=new Set,l=t.map(()=>0);if(d>=0)s.add(d);for(let[u,b]of Object.entries(p.holds??{})){let m=a(u);if(m>=0)o[m]=b}let h=t.findIndex((u)=>d>=u.from&&d<=u.to);if(h>=0){let u=t[h].count??1/0;l[h]=Math.min(u,Math.max(1,l[h])+(p.tick??0))}c=d>=0?d:void 0}return{holds:o,seen:i&&n.length?s:null,lit:c,layers:l}}function Yn(e,t){return e.some((n)=>n.holds)||t.some((n)=>n.holds||n.send||n.tick)}import{jsx as X,jsxs as Ne,Fragment as Op}from"react/jsx-runtime";var Cp=88,Sp=24,Tp=16,Mp=104,Bp=420,Ap=260,$p=3000,Lp=[];function Ep(e,t,n,r=!1){return e*(r?Mp:Cp)+(e-1)*Sp+t*Tp<=n}function Fp(e,t){let n=[];for(let r=0;r<e;r++){let o=t.find((a)=>a.from===r);if(o)n.push({start:r,end:o.to,group:o}),r=o.to;else n.push({start:r,end:r})}return n}function Ca({id:e,title:t,direction:n,nodes:r,groups:o=[]}){let a=qn(null),i=qn(null),s=qn([]),l=ke(a),[c,p]=Na(null),d=Tr(e),h=d?.steps??Lp,u=Np(()=>jn(r,o,h,d?.at??0),[r,o,h,d?.at]),m=zp(d,r,o,u,i,s,a)??u,N=Yn(r,h),y=m.holds.some((T)=>T.length>0),k=vp(),S=n==="down"||!Ep(r.length,o.length,l,y),x=c===null?void 0:r[c],v=(T,L,R)=>Ne("li",{className:"hb-flow-step",children:[R&&X(wa,{}),X(Rp,{node:T,chips:m.holds[L],lit:m.lit===L,idle:m.seen!==null&&!m.seen.has(L),open:c===L,panelId:k,boxRef:(V)=>{s.current[L]=V},onTap:()=>p((V)=>V===L?null:L)})]},L);function C(T){if(T.key==="Escape"&&c!==null)p(null)}return Ne("div",{className:"hb-card hb-flow",onKeyDown:C,children:[t&&X("div",{className:"hb-card-title",children:t}),Ne("div",{ref:a,className:"hb-flow-box",children:[X("ol",{className:`hb-flow-chain ${S?"hb-flow-down":"hb-flow-right"}`,children:Fp(r.length,o).map(({start:T,end:L,group:R})=>R?Ne("li",{className:"hb-flow-step",style:{flexGrow:L-T+1},children:[T>0&&X(wa,{}),Ne("div",{className:"hb-flow-group",children:[Ne("div",{className:"hb-flow-group-head",children:[X("span",{className:"hb-flow-group-label",children:R.label}),R.count!==void 0&&X(Ip,{layer:m.layers[o.indexOf(R)],count:R.count})]}),X("ol",{className:"hb-flow-chain",children:r.slice(T,L+1).map((V,j)=>v(V,T+j,j>0))})]})]},T):X(kp,{children:v(r[T],T,T>0)},T))}),N&&d&&X("div",{ref:i,className:"hb-flow-packet","aria-hidden":"true"})]}),x?.note&&Ne("div",{id:k,className:"hb-flow-panel",role:"region","aria-label":x.label,children:[X("div",{className:"hb-flow-panel-title",children:x.label}),X("p",{className:"hb-flow-note",children:X(E,{text:x.note})})]})]})}function Ip({layer:e,count:t}){return X("span",{className:"hb-chip hb-chip-soft hb-flow-count",children:e?`layer ${e} of ${t}`:`× ${t}`})}function zp(e,t,n,r,o,a,i){let[s,l]=Na(null);return wp(()=>{let c=e&&e.from!==null&&e.at===e.from+1?e.steps[e.at]:void 0,p=o.current;if(!e||!c||!(c.send||c.tick)||!p||typeof p.animate!=="function"||ct()){l(null);return}let d=jn(t,n,e.steps,e.from),h=!0,u=null,b=(N)=>{let y=a.current[N],k=i.current?.getBoundingClientRect();if(!y||!k)return null;let S=y.getBoundingClientRect();return{left:S.left-k.left,top:S.top-k.top,right:S.right-k.left,bottom:S.bottom-k.top}},m=async(N,y,k)=>{let S=b(N),x=b(y);if(!S||!x)return h;let v=va(S,x,y<=N);p.style.opacity="1",u=p.animate(v.map((C)=>({transform:`translate(${C.x}px, ${C.y}px)`})),{duration:k,easing:"ease-in-out",fill:"forwards"});try{return await u.finished,h}catch{return!1}finally{p.style.opacity="0"}};return l(d),(async()=>{let N=c.tick?n.findIndex((y)=>r.lit!==void 0&&r.lit>=y.from&&r.lit<=y.to):-1;if(N>=0){let{from:y,to:k}=n[N],S=Math.min(Ap,$p/(2*c.tick));for(let x=1;x<=c.tick;x++){let v=d.layers.map((C,T)=>T===N?Math.min(n[N].count??1/0,Math.max(1,C)+x):C);if(!await m(k,y,S))return;if(l({...d,lit:y,layers:v}),!await m(y,k,S))return;l({...d,lit:k,layers:v})}}if(c.send&&d.lit!==void 0&&r.lit!==void 0&&!await m(d.lit,r.lit,Bp))return;if(h)l(null)})(),()=>{h=!1,u?.cancel()}},[e]),s}function Rp({node:e,chips:t,lit:n,idle:r,open:o,panelId:a,boxRef:i,onTap:s}){let l=`hb-flow-node${n?" hb-flow-lit":""}${o?" hb-flow-open":""}${r?" hb-flow-idle":""}`,c=t.length>0&&X(Pp,{chips:t},JSON.stringify(t)),p=Ne(Op,{children:[e.icon&&X("span",{className:"hb-flow-icon",children:X(D,{name:e.icon,size:14})}),X("span",{className:"hb-flow-label",children:e.label})]});if(!e.note)return Ne("div",{ref:i,className:l,"aria-current":n?"step":void 0,children:[p,c]});return Ne("button",{ref:i,type:"button",className:l,"aria-expanded":o,"aria-controls":o?a:void 0,"aria-current":n?"step":void 0,onClick:s,children:[p,X("span",{className:"hb-flow-more","aria-hidden":"true",children:o?"−":"+"}),c]})}function Pp({chips:e}){return X("span",{className:"hb-flow-holds",children:e.map((t,n)=>X("span",{className:t.accent?"hb-flow-chip hb-flow-chip-accent":"hb-flow-chip",children:t.text},n))})}function wa(){return X("span",{className:"hb-flow-arrow","aria-hidden":"true",children:X("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:X("path",{d:"M4 12h15M13 6l6 6-6 6"})})})}var Dp=10,_p=3,Hp=10,Wp=16,Kp="group needs a label and a run of node ids next to each other";function Sa(e,t){let n=I([e.nodes,e.stages])??[],r=[],o=new Set;if(n.forEach((s,l)=>{let c=f([s?.label,s?.title,s?.name],40);if(!c){t.at("nodes").at(l).drop("node needs a label");return}let p=Pe(s.id);if(p!==void 0&&o.has(p))p=void 0;if(p!==void 0)o.add(p);let d=Zn(s.holds,t.at("nodes").at(l).at("holds"));r.push(w({id:p,label:c,icon:Re(s.icon),note:f([s.note,s.text,s.description],280),holds:d}))}),r.length<2)return t.drop("flow needs at least 2 nodes");let a=B(r,Dp,t,"nodes"),i=Vp(e.groups,a,t);return w({type:"flow",id:Pe(e.id),title:A(e.title,80),direction:e.direction==="down"?"down":"right",nodes:a,groups:i.length?i:void 0})}function Vp(e,t,n){if(!Array.isArray(e))return[];let r=[],o=new Set;return e.forEach((a,i)=>{let s=n.at("groups").at(i),l=A(a?.label,40),p=(Array.isArray(a?.nodes)?a.nodes:[]).map((m)=>t.findIndex((N)=>N.id!==void 0&&N.id===m)),d=p[0],h=p.length>0&&p.every((m,N)=>m>=0&&m===d+N);if(!l||!h){s.drop(Kp);return}if(p.some((m)=>o.has(m))){s.drop("groups can't share nodes");return}p.forEach((m)=>o.add(m));let u=M(a.count),b=u!==null&&Number.isInteger(u)&&u>=2&&u<=100?u:void 0;if(a.count!==void 0&&b===void 0)s.drop("count is a whole number from 2 to 100; left out");r.push(w({label:l,from:d,to:p[p.length-1],count:b}))}),B(r,_p,n,"groups")}function Zn(e,t){if(!Array.isArray(e))return;let n=[];for(let r of e){let o=ge(r&&typeof r==="object"?r.text:r,Wp);if(o!==void 0)n.push(w({text:o,accent:r?.tone==="accent"?!0:void 0}))}return B(n,Hp,t,"chips")}import{useContext as za,useEffect as dd,useRef as Ia,useState as Ra}from"react";var Gp=12,Xp=60,Up=100,Jn=80,jp=80,Yp=40,Ta=20,qp=60,Mt=500,Zp=["select","radio","checkbox","text","slider"],Jp=/^[A-Za-z_][\w-]{0,39}$/,Qp=["__proto__","constructor","prototype"],ed={select:"select",dropdown:"select",radio:"radio",choice:"radio",checkbox:"checkbox",checkboxes:"checkbox",multi:"checkbox",multiselect:"checkbox",text:"text",input:"text",textarea:"text",slider:"slider",range:"slider"};function Ba(e,t){let n=I([e.fields,e.inputs,e.questions]);if(!n)return t.drop("form needs fields");let r=[];if(n.forEach((s,l)=>{let c=t.at("fields").at(l),p=rd(s,c);if(!p)return;if(r.some((d)=>d.id===p.id)){c.drop(`field id "${p.id}" is used twice`);return}r.push(p)}),!r.length)return t.drop("form has no usable field");let o=f([e.title,e.label],80),a=td(f([e.id,e.name],60),o),i=f([e.submit,e.button],24)??"Send";return w({type:"form",id:a,title:o,submit:i,fields:B(r,Gp,t,"fields"),path:t.path})}function td(e,t){if(e)return e;return(t??"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,40)||"form-1"}function nd(e,t=Up){if(e.length<=t)return e;let n=e.slice(0,t-1),r=n.lastIndexOf(" ");return`${(r>t/2?n.slice(0,r):n).trimEnd()}…`}function rd(e,t){if(!e||typeof e!=="object")return t.drop("field is not an object");let n=String(e.kind??e.type??"").trim().toLowerCase(),r=ed[n];if(!r)return t.drop(`field kind "${n}" isn't one of ${Zp.join(", ")}`);let o=f([e.id,e.name,e.key],200);if(!o)return t.drop("field needs an id");if(!Jp.test(o))return t.drop('field id must be a word like "where" (letters, digits, _ or -)');if(Qp.includes(o))return t.drop(`field id "${o}" is reserved`);let a=f([e.label,e.title],400),i=f([e.group,e.section],Yp),s=w({id:o,label:a?nd(a):o,group:i,required:e.required===!0});if(r==="text")return id(e,n,s);if(r==="slider")return sd(e,s,t);let l=ad(I([e.options,e.choices])??[],t);if(!l.length)return t.drop(`${r} needs options`);let c=l.map((h)=>h.value);if(r==="checkbox"){let h=od(e.value).map((u)=>String(u)).filter((u)=>c.includes(u));return{...s,kind:r,options:l,value:[...new Set(h)]}}let p=Oe([e.value,e.default]),d=p!==void 0&&c.includes(p)?p:void 0;return w({...s,kind:r,options:l,value:d})}function od(e){if(Array.isArray(e))return e;if(e===void 0)return[];return[e]}function ad(e,t){let n=[];for(let r of e){let o=!!r&&typeof r==="object",a=o?Oe([r.value,r.id,r.label],Jn):Oe([r],Jn);if(a===void 0||n.some((l)=>l.value===a))continue;let i=(o?f([r.label,r.name],Jn):void 0)??a,s=o?f([r.note,r.description],jp):void 0;n.push(w({value:a,label:i,note:s}))}return B(n,Xp,t,"options")}function id(e,t,n){let r=f([e.placeholder,e.hint],qp),o=e.multiline===!0||t==="textarea",a=f([e.value,e.default],Mt);return w({...n,kind:"text",placeholder:r,multiline:o,value:a})}function sd(e,t,n){let r=M(e.min)??0,o=M(e.max)??100;if(r>=o)return n.drop("slider needs min below max");let a=M(e.step),i=a!==null&&a>0?a:Vn((o-r)/100),s=Qn(M(e.value)??M(e.default)??r,r,o,i);return w({...t,kind:"slider",min:r,max:o,step:i,value:s,unit:f([e.unit],12),ends:ld(e.ends)})}function ld(e){if(!Array.isArray(e)||e.length!==2)return;let t=f([e[0]],Ta),n=f([e[1]],Ta);return t&&n?[t,n]:void 0}function Qn(e,t,n,r){let o=Math.min(n,Math.max(t,e)),a=Math.min(n,t+Math.round((o-t)/r)*r);return Number(a.toFixed(Math.max(Ma(r),Ma(t))))}function Ma(e){let t=String(e),n=t.indexOf(".");return n===-1?0:t.length-n-1}function on(e){let t={};for(let n of e.fields)if(n.kind==="checkbox")t[n.id]=[...n.value];else if(n.kind==="slider")t[n.id]=n.value;else if(n.kind==="text")t[n.id]=n.value??"";else t[n.id]=n.value??null;return t}function Aa(e){if(typeof e==="number")return!0;if(Array.isArray(e))return e.length>0;return typeof e==="string"&&e.trim()!==""}function $a(e,t,n){if(n)return!1;return e.fields.every((r)=>!r.required||Aa(t[r.id]))}function cd(e,t){if(!Aa(t??null))return"";if(e.kind==="slider")return Be(t,e.unit);if(e.kind==="text")return String(t).trim().split(/\s*\n\s*/).join(" / ");let n=(r)=>e.options.find((o)=>o.value===r)?.label??r;if(e.kind==="checkbox")return t.map(n).join(", ");return n(String(t))}function er(e,t){let n=e[t].group;if(!n)return!1;return e[t-1]?.group!==n}function La(e,t){let n=[e.title?`Form: ${e.title} (${e.id})`:`Form: ${e.id}`];return e.fields.forEach((r,o)=>{if(er(e.fields,o))n.push(`— ${r.group} —`);n.push(`${r.label}: ${cd(r,t[r.id])||"(none)"}`)}),n.join(`
`)}function Ea(e){return{sent:!0,values:{...e}}}function Fa(e,t){if(!e||typeof e!=="object"||e.sent!==!0)return null;let n=e.values,r=on(t);if(!n||typeof n!=="object"||Array.isArray(n))return r;for(let o of t.fields){if(!Object.prototype.hasOwnProperty.call(n,o.id))continue;let a=pd(o,n[o.id]);if(a!==void 0)r[o.id]=a}return r}function pd(e,t){if(e.kind==="slider")return typeof t==="number"&&isFinite(t)?Qn(t,e.min,e.max,e.step):void 0;if(e.kind==="text")return typeof t==="string"&&t.length<=Mt?t:void 0;let n=e.options.map((r)=>r.value);if(e.kind==="checkbox"){if(!Array.isArray(t))return;return n.filter((r)=>t.includes(r))}if(t===null)return null;return typeof t==="string"&&n.includes(t)?t:void 0}import{jsx as W,jsxs as fe}from"react/jsx-runtime";function Pa(e){let{send:t}=za(_),[n,r]=Ra(()=>on(e)),[o,a]=ud(e,r),i=$a(e,n,o);function s(){if(!i)return;a(n),t(La(e,n))}return fe("form",{className:o?"hb-card hb-form hb-form-sent":"hb-card hb-form","aria-disabled":o,onSubmit:(l)=>{l.preventDefault(),s()},children:[e.title&&W("div",{className:"hb-card-title",children:W(E,{text:e.title})}),W("fieldset",{disabled:o,children:e.fields.map((l,c)=>fe("div",{children:[er(e.fields,c)&&W("div",{className:"hb-form-group",children:W(E,{text:l.group})}),W(hd,{field:l,value:n[l.id],onChange:(p)=>r((d)=>({...d,[l.id]:p}))})]},l.id))}),fe("div",{className:"hb-form-foot",children:[o&&W("span",{className:"hb-form-done",children:"✓ Sent"}),W("button",{type:"submit",className:"hb-pill hb-pill-solid",disabled:!i,children:e.submit})]})]})}function ud(e,t){let{rest:n,blockId:r}=za(_),[o,a]=Ra(!1),i=Ia(!1),s=Ia(e);s.current=e,dd(()=>{if(!n||!r)return;let c=!0;return St(n,r).then((p)=>{if(!c||i.current)return;let d=Fa(p[s.current.path],s.current);if(!d)return;t(d),a(!0)}),()=>{c=!1}},[n,r,e.path,t]);function l(c){if(i.current=!0,a(!0),n&&r)nn(n,r,e.path,Ea(c))}return[o,l]}function hd({field:e,value:t,onChange:n}){if(e.kind==="slider"){let r=typeof t==="number"?t:e.value;return fe("label",{className:"hb-form-field",children:[fe("span",{className:"hb-calc-head",children:[W("span",{className:"hb-calc-label",children:W(E,{text:e.label})}),W("span",{className:"hb-calc-value",children:Be(r,e.unit)})]}),W("input",{type:"range",className:"hb-range",min:e.min,max:e.max,step:e.step,value:r,onChange:(o)=>n(Number(o.target.value))}),e.ends&&fe("span",{className:"hb-form-ends",children:[W("span",{children:e.ends[0]}),W("span",{children:e.ends[1]})]})]})}if(e.kind==="text"){let o={className:"hb-input",value:typeof t==="string"?t:"",maxLength:Mt,placeholder:e.placeholder};return fe("label",{className:"hb-form-field",children:[W("span",{className:"hb-form-label",children:W(E,{text:e.label})}),e.multiline?W("textarea",{...o,rows:3,onChange:(a)=>n(a.target.value)}):W("input",{type:"text",...o,onChange:(a)=>n(a.target.value)})]})}if(e.kind==="select"){let r=e.options.find((o)=>o.value===t);return fe("label",{className:"hb-form-field",children:[W("span",{className:"hb-form-label",children:W(E,{text:e.label})}),fe("select",{className:"hb-input",value:r?r.value:"",onChange:(o)=>n(o.target.value),children:[!r&&W("option",{value:"",disabled:!0,children:"Choose…"}),e.options.map((o)=>W("option",{value:o.value,children:o.label},o.value))]}),r?.note&&W("span",{className:"hb-form-note",children:r.note})]})}return W(bd,{field:e,value:t,onChange:n})}function bd({field:e,value:t,onChange:n}){let r=e.kind==="radio",o=r?[String(t??"")]:Array.isArray(t)?t:[];function a(i){if(r)return n(i.value);let s=o.includes(i.value)?o.filter((l)=>l!==i.value):[...o,i.value];n(e.options.map((l)=>l.value).filter((l)=>s.includes(l)))}return fe("div",{className:"hb-form-field",role:r?"radiogroup":"group","aria-label":e.label,children:[W("span",{className:"hb-form-label",children:W(E,{text:e.label})}),W("div",{className:"hb-options",children:e.options.map((i)=>{let s=o.includes(i.value);return fe("button",{type:"button",role:r?"radio":"checkbox","aria-checked":s,onClick:()=>a(i),className:s?"hb-option hb-option-on":"hb-option",children:[i.label,i.note&&W("span",{className:"hb-option-note",children:i.note})]},i.value)})})]})}import{Fragment as fd,useState as md}from"react";function Oa(e){let t=1/0,n=-1/0;for(let r of e)for(let o of r){if(o===null)continue;t=Math.min(t,o),n=Math.max(n,o)}if(t===1/0)return{low:0,high:0};return{low:t,high:n}}function Da(e,t,n){if(e===null)return"var(--hb-well)";let r,o;if(n==="diverging"){let i=Math.max(Math.abs(t.low),Math.abs(t.high));r=e<0?"--hb-warn":"--hb-good",o=i===0?0:Math.abs(e)/i}else{let i=t.high-t.low;r="--hb-accent",o=i===0?1:(e-t.low)/i}let a=Math.round(10+60*o);return`color-mix(in srgb, var(${r}) ${a}%, transparent)`}function an(e,t){if(e===null)return"–";let n=Number.isInteger(e)?String(e):e.toFixed(1);if(!t)return n;if(t==="%")return`${n}%`;return`${n} ${t}`}import{jsx as pt,jsxs as sn}from"react/jsx-runtime";var gd=6;function _a({title:e,rows:t,cols:n,values:r,unit:o,scale:a}){let[i,s]=md(null),l=Oa(r),c=n.length<=gd;return sn("div",{className:"hb-card hb-heatmap",children:[e&&pt("div",{className:"hb-card-title",children:e}),sn("div",{className:"hb-heat-grid",style:{gridTemplateColumns:`minmax(0, max-content) repeat(${n.length}, minmax(0, 1fr))`},role:"table","aria-label":e??"Heat map",children:[pt("span",{}),n.map((p,d)=>pt("span",{className:"hb-heat-col",role:"columnheader",children:p},d)),t.map((p,d)=>sn(fd,{children:[pt("span",{className:"hb-heat-row",role:"rowheader",children:p}),n.map((h,u)=>{let b=r[d][u];return pt("button",{type:"button",className:"hb-heat-cell",style:{background:Da(b,l,a)},onClick:()=>s({row:d,col:u}),"aria-label":`${p}, ${h}: ${an(b,o)}`,children:c&&b!==null?an(b,o):""},u)})]},d))]}),i&&sn("div",{className:"hb-heat-picked",children:[t[i.row]," · ",n[i.col],": ",pt("b",{children:an(r[i.row][i.col],o)})]})]})}var Ha=12;function Ka(e,t){let n=Wa(e.cols),r=Wa(e.rows),o=Array.isArray(e.values)?e.values:[];if(!n.length||!r.length||!o.length)return t.drop("heatmap needs rows, cols and values");let a=B(n,Ha,t,"cols"),i=[],s=[];if(r.forEach((p,d)=>{let h=o[d];if(!Array.isArray(h)){t.at("values").at(d).drop(`no values for row "${p}"`);return}if(h.length<a.length){t.at("values").at(d).drop(`row "${p}" has ${h.length} values, the heatmap has ${a.length} columns`);return}i.push(p),s.push(a.map((u,b)=>M(h[b])))}),!i.length)return t.drop("heatmap has no usable row");let l=B(i,Ha,t,"rows"),c=s.slice(0,l.length);return w({type:"heatmap",title:A(e.title,80),rows:l,cols:a,values:c,unit:A(e.unit,12),scale:xd(e.scale,c)})}function Wa(e){if(!Array.isArray(e))return[];let t=[];for(let n of e){let r=ge(n,24);if(r!==void 0)t.push(r)}return t}function xd(e,t){if(e==="sequential"||e==="diverging")return e;return t.some((r)=>r.some((o)=>o!==null&&o<0))?"diverging":"sequential"}import{useEffect as yd,useState as Va}from"react";import{jsx as qe,jsxs as dt}from"react/jsx-runtime";function Ga({block:e}){let[t,n]=Va(new Set),[r,o]=Va(null),a=e.images.filter((s)=>!t.has(s.url));if(!a.length)return null;let i=(s)=>n((l)=>new Set(l).add(s));return dt("figure",{className:"hb-photos",children:[e.title&&qe("figcaption",{className:"hb-chart-title",children:e.title}),qe("div",{className:"hb-photo-strip",children:a.map((s)=>dt("button",{type:"button",className:"hb-photo",onClick:()=>o(s),"aria-label":s.caption??"Open photo",children:[qe("img",{src:s.url,alt:s.caption??"",loading:"lazy",referrerPolicy:"no-referrer",onError:()=>i(s.url)}),(s.caption||s.source)&&dt("span",{className:"hb-photo-text",children:[s.caption&&qe("span",{className:"hb-photo-caption",children:s.caption}),s.source&&qe("span",{className:"hb-photo-source",children:s.source})]})]},s.url))}),r&&qe(kd,{photo:r,onClose:()=>o(null)})]})}function kd({photo:e,onClose:t}){return yd(()=>{let n=(r)=>r.key==="Escape"&&t();return window.addEventListener("keydown",n),()=>window.removeEventListener("keydown",n)},[t]),dt("div",{className:"hb-photo-overlay",role:"dialog","aria-label":e.caption??"Photo",onClick:t,children:[qe("img",{src:e.url,alt:e.caption??"",referrerPolicy:"no-referrer"}),(e.caption||e.source)&&dt("div",{className:"hb-photo-overlay-text",children:[e.caption,e.source&&dt("span",{children:[" · ",e.source]})]})]})}function Xa(e,t){let n=Array.isArray(e.images)?e.images:Array.isArray(e.photos)?e.photos:[],r=[];if(n.forEach((o,a)=>{let i=G(o?.url)??G(o?.src);if(!i){t.at("images").at(a).drop("photo needs an https url");return}r.push(w({url:i,caption:f([o.caption,o.alt,o.title],120),source:f([o.source,o.credit],60)}))}),!r.length)return t.drop("images has no https photo");return w({type:"images",title:A(e.title,60),images:B(r,12,t,"photos")})}import{jsx as Ve,jsxs as Td}from"react/jsx-runtime";function vd(e){return typeof e.value==="number"&&!e.unit&&Number.isInteger(e.value)&&e.value>=1800&&e.value<=2100}var wd=/^[$₹€£¥]$/;function Ua(e,{full:t=!1}={}){if(e.value===null)return"–";if(typeof e.value==="string")return e.value;if(vd(e))return String(e.value);let n=!t&&Math.abs(e.value)>=xt;if(n&&e.unit&&wd.test(e.unit))return F(e.value,e.unit);let r=De(e.value,e.unit);if(r!==null)return r;let o=n?F(e.value):de(e.value,{digits:Math.abs(e.value)>=1000?0:1});return e.unit==="%"||e.unit?.startsWith("/")?`${o}${e.unit}`:e.unit?`${o} ${e.unit}`:o}function nr({item:e,trendColour:t}){let n=Ua(e),r=Ua(e,{full:!0}),o=Dt(e.change,e.change_unit),a=typeof e.value==="string";return Td("div",{className:"hb-card hb-kpi",children:[Ve("div",{className:"hb-kpi-label",children:e.label}),Ve("div",{className:a?"hb-kpi-value hb-kpi-value-text":"hb-kpi-value",title:r!==n?r:void 0,children:n}),o&&Ve("div",{className:`hb-kpi-change ${Nd(e.change)}`,children:o}),e.trend&&Ve(Cd,{values:e.trend,colour:t})]})}function qa({items:e}){let t=e.filter((n)=>n.trend).length>=2;return Ve("div",{className:"hb-kpis",children:e.map((n,r)=>Ve(nr,{item:n,trendColour:t?K(r):void 0},r))})}function Nd(e){return e>0?"hb-kpi-up":e<0?"hb-kpi-down":"hb-kpi-flat"}var Za=120,tr=28,ja=2;function Cd({values:e,colour:t}){return Ve("svg",{className:"hb-kpi-spark",viewBox:`0 0 ${Za} ${tr}`,preserveAspectRatio:"none","aria-hidden":"true",children:Ve("path",{d:Sd(e),style:t?{stroke:t}:void 0})})}function Sd(e){let t=Math.min(...e),n=Math.max(...e),r=tr-2*ja,o=(i)=>n===t?tr/2:ja+(1-(i-t)/(n-t))*r,a=(i)=>i/(e.length-1)*Za;return e.map((i,s)=>`${s?"L":"M"}${Ya(a(s))} ${Ya(o(i))}`).join("")}function Ya(e){return Math.round(e*10)/10}var Md=2,Bd=60;function Ja(e){let t=M(e.value);if(t===null)t=A(e.value,40)??null;let n=typeof e.unit==="string"?e.unit:void 0,r=e.change_unit==="pt"?"pt":"%",o={label:e.label,value:t,unit:n,change:M(e.change),change_unit:r};if(o.unit===void 0)delete o.unit;if(o.change===null)delete o.change;let a=Ad(e.trend);if(a)o.trend=a;return o}function Ad(e){if(!Array.isArray(e))return;let t=e.map(M).filter((n)=>n!==null);return t.length>=Md?t.slice(-Bd):void 0}function Qa(e,t){if(!Array.isArray(e.items))return t.drop("kpis needs items");let n=[];if(e.items.forEach((r,o)=>{if(!r||typeof r.label!=="string"){t.at("items").at(o).drop("item has no label");return}n.push(Ja(r))}),!n.length)return t.drop("kpis has no item with a label");return{type:"kpis",items:B(n,4,t,"items")}}function ei(e,t){let n=f([e.label,e.title],40);if(!n)return t.drop("stat needs a label");return{type:"stat",...Ja({...e,label:n})}}import{useState as $d}from"react";import{jsx as ie,jsxs as rr}from"react/jsx-runtime";var Ld=["badge","button","link"];function ti({kinds:e,children:t}){return ie("div",{className:"hb-row",children:t.map((n,r)=>ie("div",{className:Ld.includes(e[r])?"hb-row-cell hb-row-cell-own":"hb-row-cell",children:n},r))})}function ni({children:e}){return ie("div",{className:"hb-grid",children:e.map((t,n)=>ie("div",{className:"hb-grid-cell",children:t},n))})}function ri({children:e}){return ie("div",{className:"hb-columns",children:e.map((t,n)=>ie("div",{className:"hb-column",children:t},n))})}function oi({title:e,collapsed:t,children:n}){let[r,o]=$d(!t);if(!t)return rr("div",{className:"hb-card hb-section",children:[e&&ie("div",{className:"hb-card-title",children:ie(E,{text:e})}),ie("div",{className:"hb-section-body",children:n})]});return rr("div",{className:"hb-card hb-section",children:[rr("button",{type:"button",className:"hb-section-toggle",onClick:()=>o(!r),"aria-expanded":r,children:[ie("span",{className:"hb-card-title",children:ie(E,{text:e??""})}),ie("svg",{className:r?"hb-chevron hb-chevron-open":"hb-chevron",width:"18",height:"18",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.2",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:ie("path",{d:"M9 6l6 6-6 6"})})]}),r&&ie("div",{className:"hb-section-body hb-appear",children:n})]})}var Ed=["chart","timeline","images","table","section","grid","list","heatmap","flip","progress","streak","actions","tiles","checklist","calculator","form"],Fd=3,Id=6,zd=3;function Bt(e,t,n,r){let o=e.type,a=I([e.children,e.items,e.blocks,e.content])??[],s=n>(o==="section"||o==="columns"?0:1),l=s?n:n+1,c=[];if(a.forEach((h,u)=>{c.push(...r(h,t.at("children").at(u),l))}),!c.length)return t.drop(`${o} has no children it can draw`),[];let p=f([e.title,e.label],60);if(s){if(t.drop(`${o} nested too deep; drawn in place`),o==="section"&&p)return[{type:"heading",text:p},...c];return c}if(o==="section"){let h=e.collapsed===!0,u=p;if(!u&&h)u="Details";return[w({type:"section",title:u,collapsed:h,children:c})]}if(o==="columns"){if(c.length===1)return c;return[{type:"columns",children:B(c,zd,t,"children")}]}let d=c.find((h)=>Ed.includes(h.type));if(o==="row"&&d)return t.drop(`a ${d.type} can't sit in a row; drawn as a stack`),c;if(c.length===1)return c;if(o==="row")return c=B(c,Fd,t,"children"),[{type:"row",children:c}];return c=B(c,Id,t,"children"),[{type:"grid",children:c}]}var Rd=6,Pd=30,Od=999;function or(e,t,n,r,o=!1){let a=I([e.tabs,e.items])??[],i=n>0||o,s=[];for(let l=0;l<a.length;l++){let c=Dd(a[l],t.at("tabs").at(l),n,r);if(!c)continue;if(s.push(c),i)break}if(!s.length)return t.drop("tabs has no tab it can draw"),[];if(i)return t.drop("tabs go at the top level only; first tab drawn in place"),s[0].children;if(s.length===1)return t.drop("tabs has only one tab; drawn in place"),s[0].children;return[{type:"tabs",tabs:B(s,Rd,t,"tabs")}]}function Dd(e,t,n,r){if(!e||typeof e!=="object"||Array.isArray(e))return t.drop("tab is not an object");let o=f([e.label,e.title],Pd);if(!o)return t.drop("tab needs a label");let a=_d(I([e.children,e.items,e.blocks,e.content])??[],t,n,r);if(!a.length)return t.drop("tab has no children it can draw");let i=e.badge;return Number.isInteger(i)&&i>=1&&i<=Od?{label:o,children:a,badge:i}:{label:o,children:a}}function _d(e,t,n,r){let o=[];return e.forEach((a,i)=>{let s=t.at("children").at(i);if(n===0&&a?.type==="tabs")o.push(...or(a,s,0,r,!0));else o.push(...r(a,s,n))}),o}import{useId as Hd,useRef as Wd,useState as Kd}from"react";import{jsx as ln,jsxs as ai}from"react/jsx-runtime";function Vd(e,t,n){if(n==="ArrowRight")return(e+1)%t;if(n==="ArrowLeft")return(e-1+t)%t;return e}function ii({labels:e,badges:t=[],panel:n}){let[r,o]=Kd(0),a=Wd([]),i=Hd().replace(/[^a-zA-Z0-9]/g,"");return ai("div",{className:"hb-tabs",children:[ln("div",{className:"hb-tab-bar",role:"tablist",onKeyDown:(l)=>{let c=Vd(r,e.length,l.key);if(c===r)return;l.preventDefault(),o(c),a.current[c]?.focus()},children:e.map((l,c)=>ai("button",{type:"button",role:"tab",id:`${i}-tab-${c}`,"aria-controls":`${i}-panel`,"aria-selected":c===r,tabIndex:c===r?0:-1,className:c===r?"hb-tab hb-tab-on":"hb-tab",ref:(p)=>{a.current[c]=p},onClick:()=>o(c),"aria-label":t[c]?`${l}, ${t[c]} open`:void 0,children:[ln(E,{text:l}),t[c]?ln("span",{className:"hb-tab-badge","aria-hidden":"true",children:t[c]}):null]},c))}),ln("div",{className:"hb-tab-panel hb-appear",role:"tabpanel",id:`${i}-panel`,"aria-labelledby":`${i}-tab-${r}`,children:n(r)},r)]})}import{useContext as Gd,useState as Xd}from"react";var si=[1,3,8,4,6];function li(e,t,n){if(e.image&&!n)return"image";if(e.icon)return"icon";if(t)return"none";if(ar(e.title)===null)return"none";return"initial"}function ar(e){let t=e.match(/[\p{L}\p{N}]/u);if(!t)return null;return t[0].toLocaleUpperCase()}function ci(e){let t=e.replaceAll("**","").split(" · ")[0].trim().toLowerCase(),n=0;for(let r of t)n=(n*31+r.codePointAt(0))%1000003;return`var(--hb-chart-${si[n%si.length]})`}import{jsx as Y,jsxs as ir,Fragment as Yd}from"react/jsx-runtime";function pi({title:e,ranked:t,items:n}){return ir("div",{className:"hb-card hb-list",children:[e&&Y("div",{className:"hb-list-heading",children:Y(E,{text:e})}),n.map((r,o)=>Y(Ud,{item:r,rank:t?o+1:null},o))]})}function Ud({item:e,rank:t}){let{send:n}=Gd(_),[r,o]=Xd(!1),a=li(e,t!==null,r),i=ir(Yd,{children:[t!==null&&Y("span",{className:"hb-list-rank",children:t}),a==="image"&&Y("img",{className:"hb-list-photo",src:e.image,alt:"",loading:"lazy",referrerPolicy:"no-referrer",onError:()=>o(!0)}),a==="icon"&&e.icon&&Y("span",{className:"hb-list-icon",children:Y(D,{name:e.icon,size:17,stroke:2.2})}),a==="initial"&&Y("span",{className:"hb-list-initial",style:{background:ci(e.title)},"aria-hidden":"true",children:ar(e.title)}),ir("span",{className:"hb-list-body",children:[Y("span",{className:"hb-list-title",children:Y(E,{text:e.title})}),e.subtitle&&Y("span",{className:"hb-list-subtitle",children:Y(E,{text:e.subtitle})})]}),e.value&&Y("span",{className:"hb-list-value",children:Y(E,{text:e.value})}),(e.run||e.url)&&Y(jd,{})]});if(e.run){let s=e.run;return Y("button",{type:"button",className:"hb-list-row hb-list-link hb-list-button",title:s,onClick:()=>n(s),children:i})}if(e.url)return Y("a",{className:"hb-list-row hb-list-link",href:e.url,target:"_blank",rel:"noreferrer",children:i});return Y("div",{className:"hb-list-row",children:i})}function jd(){return Y("svg",{className:"hb-list-chevron",width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.2",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:Y("path",{d:"M9 6l6 6-6 6"})})}import{useEffect as fi,useRef as dn,useState as sr}from"react";import{useEffect as qd,useState as Zd}from"react";function cn(e,t){let n=e.getContext?.("2d");if(!n)return null;let r=window.devicePixelRatio||1,o=e.clientWidth,a=t??e.clientHeight;return e.width=Math.round(o*r),e.height=Math.round(a*r),n.setTransform(r,0,0,r,0,0),{ctx:n,width:o,height:a}}function Ze(e,t){let n=e.style.color;e.style.color=`var(${t})`;let r=getComputedStyle(e).color;return e.style.color=n,r}function pn(){let[e,t]=Zd(0);return qd(()=>{let n=()=>t((a)=>a+1),r=typeof MutationObserver>"u"?null:new MutationObserver(n);r?.observe(document.documentElement,{attributes:!0,attributeFilter:["class","style","data-theme"]});let o=typeof window.matchMedia==="function"?window.matchMedia("(prefers-color-scheme: dark)"):null;return o?.addEventListener?.("change",n),()=>{r?.disconnect(),o?.removeEventListener?.("change",n)}},[]),e}var ue={width:2.4,depth:1.5,thick:0.16,gap:0.34,open:0.5,pull:0.6};function Jd([e,t,n],r,o){let a=e*Math.cos(r)+n*Math.sin(r),i=-e*Math.sin(r)+n*Math.cos(r);return{x:a,y:t*Math.cos(o)-i*Math.sin(o),depth:t*Math.sin(o)+i*Math.cos(o)}}function di(e,t,n,r,o,a){let i=e*ue.thick+(e-1)*ue.gap+ue.open,s=Math.hypot(ue.width,ue.depth+ue.pull),l=Math.min(o*0.6/s,a*0.9/(i*Math.cos(r)+s*Math.sin(r))),c=o*0.36,p=a/2,d=([m,N,y])=>{let k=Jd([m,N-i/2,y],n,r);return{x:c+k.x*l,y:p-k.y*l}},h=ue.width/2,u=ue.depth/2,b=0;return Array.from({length:e},(m,N)=>{let y=(t[N]??0)*ue.pull,k=ue.open*(t[N]??0)/2,S=b+k,x=S+ue.thick;b=x+ue.gap+k;let v=(V,j)=>({corners:V.map(d),strength:j}),C=[],T=Math.sin(n)>0?-h:h;if(Math.sin(n)!==0)C.push(v([[T,S,y-u],[T,S,y+u],[T,x,y+u],[T,x,y-u]],0.62));C.push(v([[-h,S,y+u],[h,S,y+u],[h,x,y+u],[-h,x,y+u]],0.5));let L=v([[-h,x,y-u],[h,x,y-u],[h,x,y+u],[-h,x,y+u]],0.22);C.push(L);let R=L.corners.reduce((V,j)=>j.x>V.x?j:V);return{faces:C,label:{x:R.x+12,y:R.y+2}}})}function Qd(e,t,n){let r=!1;for(let o=0,a=e.length-1;o<e.length;a=o++){let i=e[o],s=e[a];if(i.y>n!==s.y>n&&t<(s.x-i.x)*(n-i.y)/(s.y-i.y)+i.x)r=!r}return r}function ui(e,t,n){for(let r=e.length-1;r>=0;r--)if(e[r].faces.some((o)=>Qd(o.corners,t,n)))return r;return null}import{jsx as ae,jsxs as ut}from"react/jsx-runtime";var hi=40,eu=28,tu=30,nu=340,ru={blue:"--hb-chart-1",amber:"--hb-chart-2",green:"--hb-chart-3",violet:"--hb-chart-4",accent:"--hb-accent",grey:"--hb-muted"},bi=(e)=>e*Math.PI/180;function mi({title:e,caption:t,layers:n}){let r=dn(null),o=dn([]),a=dn(null),[i,s]=sr(0),[l,c]=sr(eu),p=ou(i,n.length),d=ke(r),h=pn(),u=n[i],b=(C)=>s(Math.max(0,Math.min(n.length-1,C))),m=(C)=>c((T)=>Math.max(-hi,Math.min(hi,T+C)));fi(()=>{let C=r.current,T=C&&cn(C);if(!C||!T)return;o.current=di(n.length,p,bi(l),bi(tu),T.width,T.height),au(T.ctx,C,T.width,T.height,o.current,n.map((L)=>L.tone),n.map((L)=>L.label),p)},[p,l,d,h,n]);function N(C){a.current={x:C.clientX,moved:0},C.currentTarget.setPointerCapture?.(C.pointerId)}function y(C){if(!a.current)return;let T=C.clientX-a.current.x;a.current={x:C.clientX,moved:a.current.moved+Math.abs(T)},m(T*0.5)}function k(C){if(a.current&&a.current.moved<5){let T=C.currentTarget.getBoundingClientRect(),L=ui(o.current,C.clientX-T.left,C.clientY-T.top);if(L!==null)b(L)}a.current=null}function S(C){let T={ArrowLeft:()=>m(-5),ArrowRight:()=>m(5),ArrowUp:()=>b(i+1),ArrowDown:()=>b(i-1)};if(!T[C.key])return;C.preventDefault(),C.stopPropagation(),T[C.key]()}function x(C){if(C.key!=="ArrowLeft"&&C.key!=="ArrowRight")return;C.preventDefault(),b(i+(C.key==="ArrowRight"?1:-1))}let v=u.note?` ${u.note.replace(/\*\*/g,"")}`:"";return ut("div",{className:"hb-card hb-layers",children:[e&&ae("div",{className:"hb-card-title",children:e}),ut("div",{className:"hb-layers-body",children:[ut("div",{className:"hb-layers-stage",children:[ae("canvas",{ref:r,className:"hb-layers-canvas",tabIndex:0,role:"img","aria-label":`${e??"Layers"} in 3D, ${u.label} pulled out, ${i+1} of ${n.length}.${v}`,onPointerDown:N,onPointerMove:y,onPointerUp:k,onPointerCancel:()=>{a.current=null},onKeyDown:S}),ae("p",{className:"hb-layers-hint",children:"Drag the drawing, or use ← → on it, to turn it; ↑ ↓ change the slab."}),t&&ae("p",{className:"hb-layers-caption",children:t})]}),ut("div",{className:"hb-layers-side",onKeyDown:x,children:[ut("div",{className:"hb-steps-head",children:[ae("div",{className:"hb-steps-title",children:u.label}),ae("span",{className:"hb-steps-place",children:`${i+1} of ${n.length}`})]}),ae("div",{className:"hb-steps-body","aria-live":"polite",children:u.note&&ae("p",{className:"hb-steps-text",children:ae(E,{text:u.note})})}),ae("div",{className:"hb-steps-foot",children:ut("div",{className:"hb-steps-moves",children:[ae("button",{type:"button",className:"hb-pill",disabled:i===0,onClick:()=>b(i-1),children:"Back"}),ae("button",{type:"button",className:"hb-pill hb-pill-solid",disabled:i===n.length-1,onClick:()=>b(i+1),children:"Next"})]})}),ae("ol",{className:"hb-layers-list","aria-label":"Slabs",children:n.map((C,T)=>ae("li",{children:ae("button",{type:"button",className:"hb-layers-slab","aria-pressed":T===i,onClick:()=>b(T),children:C.label})},T))})]})]})]})}function ou(e,t){let[n,r]=sr(()=>Array.from({length:t},(a,i)=>i===e?1:0)),o=dn(n);return o.current=n,fi(()=>{let a=Array.from({length:t},(c,p)=>p===e?1:0);if(ct()||typeof requestAnimationFrame!=="function")return r(a);let i=o.current,s=performance.now(),l=requestAnimationFrame(function c(p){let d=Math.min(1,(p-s)/nu),h=d<0.5?2*d*d:1-(-2*d+2)**2/2;if(r(a.map((u,b)=>(i[b]??0)+(u-(i[b]??0))*h)),d<1)l=requestAnimationFrame(c)});return()=>cancelAnimationFrame(l)},[e,t]),n}function au(e,t,n,r,o,a,i,s){let l=Ze(t,"--hb-surface"),c=Ze(t,"--hb-ink"),p=Ze(t,"--hb-accent"),d=getComputedStyle(t).fontFamily||"system-ui";e.clearRect(0,0,n,r),e.lineWidth=1,e.textBaseline="middle",o.forEach((h,u)=>{let b=(s[u]??0)>0.5,m=b?p:Ze(t,ru[a[u]]);h.faces.forEach((N,y)=>{let k=y===h.faces.length-1;e.beginPath(),N.corners.forEach((S,x)=>x?e.lineTo(S.x,S.y):e.moveTo(S.x,S.y)),e.closePath(),e.shadowColor=p,e.shadowBlur=b&&k?18*(s[u]??0):0,e.globalAlpha=1,e.fillStyle=l,e.fill(),e.shadowBlur=0,e.globalAlpha=k&&b?0.45:N.strength,e.fillStyle=m,e.fill(),e.globalAlpha=0.28,e.strokeStyle=c,e.stroke()}),e.globalAlpha=b?1:0.65,e.fillStyle=b?p:c,e.font=`${b?700:600} 12.5px ${d}`,e.fillText(i[u],h.label.x,h.label.y)}),e.globalAlpha=1}var iu=["blue","amber","green","violet","accent","grey"];function gi(e,t){let n=[];if((I([e.layers,e.levels])??[]).forEach((r,o)=>{let a=f([r?.label,r?.title,r?.name],24);if(!a)return t.at("layers").at(o).drop("layer needs a label");let i=iu.includes(r.tone)?r.tone:"blue";n.push(w({label:a,tone:i,note:f([r.note,r.text,r.description],280)}))}),n.length<2)return t.drop("layers needs at least 2 slabs");return w({type:"layers",title:A(e.title,80),caption:A(e.caption,200),layers:B(n,12,t,"layers")})}var su=12;function xi(e,t){let n=I([e.items,e.rows]);if(!n)return t.drop("list needs items");let r=[];if(n.forEach((a,i)=>{let s=lu(a);if(!s){t.at("items").at(i).drop("row has no title");return}if(te(s.run)){t.at("items").at(i).drop(Xe);return}r.push(s)}),!r.length)return t.drop("list has no row with a title");let o=e.ranked===!0||e.numbered===!0;return w({type:"list",title:f([e.title],60),ranked:o,items:B(r,su,t,"rows")})}function lu(e){if(typeof e==="string"){let o=f([e],80);return o?{title:o}:null}if(!e||typeof e!=="object")return null;let t=f([e.title,e.name,e.label],80),n=t??f([e.text],160);if(!n)return null;let r=t?e.text:void 0;return w({title:n,subtitle:pe([e.subtitle,e.description,e.detail,e.note,r],160),value:Oe([e.value,e.price,e.rating,e.score,e.meta,e.badge],30),icon:Re(e.icon),image:G(e.image),run:f([e.run],300),url:G(e.url)})}import{jsx as le,jsxs as At,Fragment as uu}from"react/jsx-runtime";function cu(e,t,n){if(!n.length)return Math.max(0,Math.min(1,e/t));if(e<=n[0].at)return 0;for(let r=1;r<n.length;r++)if(e<n[r].at)return(r-1+(e-n[r-1].at)/(n[r].at-n[r-1].at))/(n.length-1);return 1}function pu(e,t,n){let r=F(t),o=F(t,n);if(!n||o!==r&&o!==`${r} ${n}`)return`${F(e,n)} / ${o}`;return`${F(e)} / ${r} ${n}`}function yi({title:e,value:t,goal:n,unit:r,steps:o}){let a=cu(t,n,o);return At("div",{className:"hb-card hb-progress",children:[At("div",{className:"hb-progress-head",children:[le("span",{className:"hb-progress-icon",children:le(D,{name:"trophy",size:19,stroke:2.2})}),le("span",{className:"hb-card-title",children:e}),At("span",{className:"hb-progress-amount",children:[le(D,{name:"flame",size:15,stroke:2.2}),pu(t,n,r)]})]}),o.length===0?le("div",{className:"hb-progress-track",children:le("span",{className:"hb-progress-fill",style:{width:`${a*100}%`}})}):le(du,{steps:o,value:t,share:a,unit:r})]})}function du({steps:e,value:t,share:n,unit:r}){let o=e.length,a=`${50/o}%`,i=(o-1)/o*100;return At(uu,{children:[At("div",{className:"hb-progress-nodes",children:[le("span",{className:"hb-progress-track hb-progress-track-steps",style:{left:a,right:a}}),le("span",{className:"hb-progress-fill hb-progress-fill-steps",style:{left:a,width:`${i*n}%`}}),e.map((s,l)=>{let c=t>=s.at;return le("span",{className:c?"hb-progress-node hb-progress-node-done":"hb-progress-node",style:{left:`${(l+0.5)/o*100}%`},children:le(D,{name:c?"check":"lock",size:12,stroke:2.6})},l)})]}),le("div",{className:"hb-progress-labels",style:{gridTemplateColumns:`repeat(${o}, minmax(0, 1fr))`},children:e.map((s,l)=>le("span",{children:typeof s.label==="number"?F(s.label,r):s.label},l))})]})}function ki(e,t){let n=A(e.title,40);if(!n)return t.drop("progress needs a title");let r=M(e.value);if(r===null)return t.drop("progress needs a numeric value");let o=M(e.goal);if(o===null||o<=0)return t.drop("progress needs a goal above 0");let a=[];return(Array.isArray(e.steps)?e.steps:[]).forEach((s,l)=>{let c=A(s?.label,28)??M(s?.label),p=M(s?.at);if(c===void 0||c===null||p===null){t.at("steps").at(l).drop("checkpoint needs a label and a number `at`");return}a.push({label:c,at:p})}),a.sort((s,l)=>s.at-l.at),w({type:"progress",title:n,value:r,goal:o,unit:A(e.unit,12),steps:B(a,6,t,"checkpoints")})}var vi=/^[A-Za-z_][A-Za-z0-9_]{0,23}$/,hu=4,bu=8,fu=3,mu=1000,gu=60,xu=10;function wi(e,t){let n=yu(e.t);if(!n)return t.drop("t needs a name (not a helper's) and to above 0");let r=new Set([n.name]),o=[],a=e.values&&typeof e.values==="object"&&!Array.isArray(e.values)?e.values:{};for(let[p,d]of Object.entries(a)){let h=M(d);if(!vi.test(p)||_e(p)||r.has(p)||h===null){t.at("values").drop(`value "${p}" left out: a new name and a number, please`);continue}r.add(p),o.push([p,h])}let i=[];(I([e.inputs,e.sliders])??[]).forEach((p,d)=>{let h=Kn(p,t.at("inputs").at(d));if(!h)return;if(r.has(h.id))return t.at("inputs").at(d).drop(`name "${h.id}" is used twice`);r.add(h.id),i.push(h)});let s=e.view&&typeof e.view==="object"?e.view:{},l=[];if((I([s.piles,s.series,e.piles,e.series])??[]).forEach((p,d)=>{let h=ku(p,r,t.at("view").at("piles").at(d));if(h)l.push(h)}),!l.length)return t.drop("simulate has no pile it can work out");let c=M(s.per);return w({type:"simulate",title:f([e.title],80),t:n,inputs:B(i,hu,t,"inputs"),values:B(o,bu,t,"values"),view:s.kind==="chart"?"chart":"dots",per:c!==null&&c>0?c:void 0,start:A(s.start,40),piles:B(l,fu,t,"piles"),unit:A(e.unit,12),source:A(e.source,120)})}function yu(e){if(!e||typeof e!=="object")return null;let t=A(e.name,24),n=M(e.to);if(!t||!vi.test(t)||_e(t)||n===null||n<=0)return null;let r=M(e.step),o=Math.max(r!==null&&r>0?r:1,n/mu),a=M(e.speed),i=a!==null&&a>0?Math.min(gu,n/a):xu;return w({name:t,to:n,step:o,unit:A(e.unit,12),seconds:i})}function ku(e,t,n){let r=f([e?.name,e?.label],40),o=f([e?.formula,e?.expr],300);if(!r||!o)return n.drop("pile needs a name and a formula");try{let a=xe(ye(o)).filter((i)=>!t.has(i));if(a.length)return n.drop(`formula uses ${a.join(", ")}, which nothing gives`)}catch(a){return n.drop(`formula can't be read (${a.message})`)}return w({name:r,formula:o,adds:f([e.adds],40)})}import{useEffect as Ei,useMemo as Ft,useRef as $i,useState as bn}from"react";import{jsx as lr}from"react/jsx-runtime";function un({text:e,url:t}){if(!t)return lr("div",{className:"hb-source",children:e});return lr("div",{className:"hb-source",children:lr("a",{href:t,target:"_blank",rel:"noreferrer",children:e})})}import{useEffect as vu,useRef as Ti}from"react";function cr(e,t){return Math.round(Math.floor(e/t+0.000000001)*t*1e9)/1e9}function Ni(e,t){let n=[];for(let r=0;r*t<=e+0.000000001;r++)n.push(cr(r*t,t));return n}function hn(e){let t=10**Math.floor(Math.log10(e)),n=e/t;return(n<=1.000000001?1:n<=2?2:n<=5?5:10)*t}function Ci(e,t){if(!(t>0))return e??1;if(e!==void 0&&t/e<=600)return e;return hn(t/(e===void 0?150:600))}function Si(e,t,n,r){let a=[t,...n.slice(0,r+1)].findIndex((i)=>e<i);return a<0?r+1:a}import{jsx as Je,jsxs as $t,Fragment as Su}from"react/jsx-runtime";var wu=280,Nu=14;function Mi({piles:e,amounts:t,start:n,per:r,most:o,playing:a,unit:i,label:s}){let l=t.map((d)=>Math.max(0,Math.round((d??0)/r))),c=Math.max(0,Math.round(n/r)),p=Math.max(1,...o.map((d)=>Math.round(d/r)));return $t(Su,{children:[Je("div",{className:"hb-sim-piles",children:e.map((d,h)=>Je(Cu,{k:h,name:d.name,amount:t[h],counts:l,startDots:c,tallest:p,playing:a,unit:i},h))}),$t("div",{className:"hb-legend",children:[$t("span",{className:"hb-legend-item",children:[Je("i",{className:"hb-legend-dot",style:{background:K(0)}}),`${s??"Start"} (a dot is ${F(r,i,{full:!0})})`]}),e.map((d,h)=>$t("span",{className:"hb-legend-item",children:[Je("i",{className:"hb-legend-dot",style:{background:K(h+1)}}),d.adds??d.name]},h))]})]})}function Cu({k:e,name:t,amount:n,counts:r,startDots:o,tallest:a,playing:i,unit:s}){let l=Ti(null),c=Ti([]),p=ke(l),d=pn(),h=r[e],u=Math.max(20,Math.floor(p/Nu)),b=p/u,m=Math.ceil(a/u)*b,N=n===null?"–":F(n,s,{full:!0});return vu(()=>{let y=l.current;if(!y)return;let k=i&&!ct(),S=0,x=()=>{let v=cn(y,m);if(!v)return;let C=performance.now(),T=[1,2,3,4].map((R)=>Ze(y,`--hb-chart-${R}`));c.current.length=Math.min(c.current.length,h);while(c.current.length<h)c.current.push(k?C:0);let L=!1;v.ctx.clearRect(0,0,v.width,v.height);for(let R=0;R<h;R++){let V=Math.min(1,(C-c.current[R])/wu);if(V<1)L=!0;v.ctx.fillStyle=T[Si(R,o,r,e)],v.ctx.beginPath(),v.ctx.arc(R%u*b+b/2,v.height-(Math.floor(R/u)*b+b/2),b*0.38*V,0,Math.PI*2),v.ctx.fill()}if(L)S=requestAnimationFrame(x)};return x(),()=>cancelAnimationFrame(S)},[h,r.join(),o,p,m,d]),$t("div",{className:"hb-sim-pile",children:[Je("div",{className:"hb-sim-pile-name",children:t}),Je("div",{className:"hb-sim-amount",children:N}),Je("canvas",{ref:l,className:"hb-sim-canvas",style:{height:m},role:"img","aria-label":`${t}: ${N}, ${h} dots`})]})}import{useRef as Tu}from"react";import{jsx as Ge,jsxs as Et}from"react/jsx-runtime";var Lt=220,Le={left:52,right:12,top:10,bottom:22};function Ai({piles:e,lines:t,times:n,index:r,unit:o}){let a=Tu(null),i=ke(a),s=n[n.length-1],l=Math.max(0.000000001,...t.flat().map((k)=>k??0)),c=hn(l/4),p=Math.ceil(l/c)*c,d=hn(s/5),h=(k)=>Le.left+k/s*(i-Le.left-Le.right),u=(k)=>Lt-Le.bottom-k/p*(Lt-Le.top-Le.bottom),b=Array.from({length:Math.round(p/c)+1},(k,S)=>S*c),m=Array.from({length:Math.floor(s/d+0.000000001)+1},(k,S)=>S*d),N=n[r],y=e.map((k,S)=>`${k.name} ${Bi(t[S][r],o)}`).join(", ");return Et("div",{ref:a,className:"hb-sim-chart",children:[Et("svg",{width:"100%",height:Lt,viewBox:`0 0 ${i} ${Lt}`,role:"img","aria-label":`Line chart at ${F(N)}: ${y}`,children:[b.map((k)=>Et("g",{children:[Ge("line",{x1:Le.left,x2:i-Le.right,y1:u(k),y2:u(k),className:"hb-sim-grid"}),Ge("text",{x:Le.left-6,y:u(k)+4,textAnchor:"end",children:F(k,o)})]},k)),m.map((k)=>Ge("text",{x:h(k),y:Lt-6,textAnchor:"middle",children:F(k)},k)),e.map((k,S)=>{let x=t[S].slice(0,r+1).flatMap((C,T)=>C===null?[]:[`${h(n[T]).toFixed(1)},${u(C).toFixed(1)}`]),v=t[S][r];return Et("g",{style:{color:K(S+1)},children:[Ge("polyline",{points:x.join(" "),className:"hb-sim-line"}),v!==null&&Ge("circle",{cx:h(N),cy:u(v),r:4.5,className:"hb-sim-point"})]},S)})]}),Ge("div",{className:"hb-legend",children:e.map((k,S)=>Et("span",{className:"hb-legend-item",children:[Ge("i",{className:"hb-legend-dot",style:{background:K(S+1)}}),k.name,Ge("span",{className:"hb-legend-value",children:Bi(t[S][r],o)})]},S))})]})}function Bi(e,t){return e===null||e===void 0?"–":F(e,t,{full:!0})}import{jsx as ce,jsxs as Qe}from"react/jsx-runtime";function Fi(e){let{title:t,t:n,inputs:r,values:o,piles:a,unit:i,source:s}=e,l=$i(null),c=$i(n.to),[p,d]=bn(()=>new Map(r.map((H)=>[H.id,H.value]))),[h,u]=bn(e.view),[b,m]=bn(n.to),[N,y]=bn(!1),k=Ft(()=>a.map((H)=>ye(H.formula)),[a]),S=Ft(()=>new Map([...o,...p]),[o,p]),x=Ft(()=>Ni(n.to,n.step),[n]),v=Ft(()=>Li(k,S,n.name,x),[k,S,n.name,x]),C=Ft(()=>{let H=new Map([...o,...r.map((P)=>[P.id,P.max])]),Me=Li(k,H,n.name,[n.to]);return k.map((P,me)=>Math.max(0,Me[me][0]??0,...v[me].map((vn)=>vn??0)))},[k,o,r,v,n]),T=Ci(e.per,C.reduce((H,Me)=>H+Me,0)),L=Math.round(b/n.step),R=v.map((H)=>H[L]??null);Bu(N,()=>y(!1),c,n,m),Au(l,N,()=>y(!1));function V(){if(N)return y(!1);if(c.current>=n.to)c.current=0,m(0);y(!0)}function j(H){y(!1),c.current=H,m(H)}return Qe("div",{ref:l,className:"hb-card hb-sim",children:[Qe("div",{className:"hb-sim-head",children:[t&&ce("div",{className:"hb-card-title",children:ce(E,{text:t})}),Qe("div",{className:"hb-sim-switch",role:"group","aria-label":"View",children:[ce("button",{type:"button","aria-pressed":h==="dots",onClick:()=>u("dots"),children:"Dots"}),ce("button",{type:"button","aria-pressed":h==="chart",onClick:()=>u("chart"),children:"Line chart"})]})]}),Qe("div",{className:"hb-sim-controls",children:[Qe("button",{type:"button",className:"hb-pill hb-pill-solid hb-sim-play",onClick:V,children:[ce("svg",{width:"14",height:"14",viewBox:"0 0 24 24","aria-hidden":"true",fill:"currentColor",children:ce("path",{d:N?"M7 5h3.5v14H7zM13.5 5H17v14h-3.5z":"M8 5.5v13l10.5-6.5z"})}),N?"Pause":"Play"]}),Qe("label",{className:"hb-calc-slider hb-sim-time",children:[Qe("span",{className:"hb-calc-head",children:[ce("span",{className:"hb-calc-label",children:n.unit?Mu(n.unit):n.name}),ce("span",{className:"hb-calc-value",children:`${F(b)} of ${F(n.to)}`})]}),ce("input",{type:"range",className:"hb-range",min:0,max:n.to,step:n.step,value:b,"aria-label":n.unit??n.name,onChange:(H)=>j(Number(H.target.value))})]}),r.map((H)=>ce(Wn,{input:H,value:p.get(H.id)??H.value,onMove:(Me)=>d((P)=>new Map(P).set(H.id,Me))},H.id))]}),h==="dots"?ce(Mi,{piles:a,amounts:R,start:v[0][0]??0,per:T,most:C,playing:N,unit:i,label:e.start}):ce(Ai,{piles:a,lines:v,times:x,index:L,unit:i}),s&&ce(un,{text:s})]})}function Mu(e){return e.charAt(0).toUpperCase()+e.slice(1)}function Li(e,t,n,r){let o=Gt(En);return e.map((a)=>r.map((i)=>Ue(a,new Map(t).set(n,i),o)))}function Bu(e,t,n,r,o){Ei(()=>{if(!e)return;let a=performance.now(),i=requestAnimationFrame(function s(l){if(n.current=Math.min(r.to,n.current+(l-a)/1000*(r.to/r.seconds)),a=l,o(cr(n.current,r.step)),n.current>=r.to)return t();i=requestAnimationFrame(s)});return()=>cancelAnimationFrame(i)},[e])}function Au(e,t,n){Ei(()=>{if(!t||!e.current||typeof IntersectionObserver>"u")return;let r=new IntersectionObserver(([o])=>{if(!o.isIntersecting)n()});return r.observe(e.current),()=>r.disconnect()},[t])}function Ii(e,t){let n=[];if(Array.isArray(e.sources)){for(let i of e.sources)if(i&&f([i.name,i.title]))n.push(i)}let r=typeof e.text==="string"?e.text:"";if(!r)r=n.map((i)=>f([i.name,i.title])).join(" · ");if(!r)return t.drop("source needs text");let a=[e.url,...n.map((i)=>i.url)].find((i)=>typeof i==="string"&&/^https?:\/\//.test(i));if(a)return{type:"source",text:r,url:a};return{type:"source",text:r}}function zi(e,t){let n=I([e.items,e.steps])??[],r=[];if(n.forEach((o,a)=>{let i=f([o?.title,o?.label],80);if(!i){t.at("items").at(a).drop("step needs a title");return}let s=M(o.tick);r.push(w({title:i,text:f([o.text,o.body,o.description],600),node:Pe(o.node),image:G(o.image),holds:$u(o.holds,t.at("items").at(a).at("holds")),send:o.send===!0?!0:void 0,tick:s!==null&&Number.isInteger(s)&&s>=1&&s<=20?s:void 0}))}),!r.length)return t.drop("steps has no titled step");return w({type:"steps",title:A(e.title,80),for:Pe(e.for)??Pe(e.flow),items:B(r,12,t,"steps")})}function $u(e,t){if(!e||typeof e!=="object"||Array.isArray(e))return;let n={};for(let[r,o]of Object.entries(e).slice(0,10)){let a=Pe(r),i=a===void 0?void 0:Zn(o,t.at(a));if(a!==void 0&&i!==void 0)n[a]=i}return Object.keys(n).length?n:void 0}import{useEffect as Ri,useRef as Lu,useState as Pi}from"react";import{jsx as Ce,jsxs as It}from"react/jsx-runtime";function Oi({title:e,for:t,items:n}){let[r,o]=Pi(0),[a,i]=Pi(()=>new Set),s=Mr(),l=Lu(null),c=n[r],p=(u)=>o(Math.max(0,Math.min(n.length-1,u)));Ri(()=>{if(t!==void 0)s(t,{steps:n,at:r,from:l.current});l.current=r},[t,n,r,s]),Ri(()=>()=>{if(t!==void 0)s(t,void 0)},[t,s]);function d(u){if(u.key==="ArrowRight")p(r+1);else if(u.key==="ArrowLeft")p(r-1);else return;u.preventDefault()}let h=c.image&&!a.has(r)?c.image:void 0;return It("div",{className:"hb-card hb-steps",role:"group","aria-label":e??"Steps",onKeyDown:d,children:[It("div",{className:"hb-steps-head",children:[e&&Ce("div",{className:"hb-card-title",children:e}),Ce("span",{className:"hb-steps-place",children:`${r+1} of ${n.length}`})]}),It("div",{className:"hb-steps-body","aria-live":"polite",children:[Ce("div",{className:"hb-steps-title",children:c.title}),c.text&&Ce("p",{className:"hb-steps-text",children:Ce(E,{text:c.text})}),h&&Ce("img",{className:"hb-steps-photo",src:h,alt:"",loading:"lazy",referrerPolicy:"no-referrer",onError:()=>i((u)=>new Set(u).add(r))},r)]}),It("div",{className:"hb-steps-foot",children:[Ce("div",{className:"hb-steps-dots",children:n.map((u,b)=>Ce("button",{type:"button",className:b===r?"hb-steps-dot hb-steps-dot-on":"hb-steps-dot","aria-label":`Step ${b+1}: ${u.title}`,"aria-current":b===r?"step":void 0,onClick:()=>p(b)},b))}),It("div",{className:"hb-steps-moves",children:[Ce("button",{type:"button",className:"hb-pill",disabled:r===0,onClick:()=>p(r-1),children:"Back"}),Ce("button",{type:"button",className:"hb-pill hb-pill-solid",disabled:r===n.length-1,onClick:()=>p(r+1),children:"Next"})]})]})]})}function Di(e,t){let n=M(e.count);if(n===null)return t.drop("streak needs a numeric count");let r=[];(Array.isArray(e.days)?e.days:[]).forEach((s,l)=>{let c=A(s?.label,4);if(!c){t.at("days").at(l).drop("day has no label");return}r.push(w({label:c,date:A(s.date,3),done:s.done===!0,today:s.today===!0}))});let a=A(e.label,30)??"Current streak",i=A(e.unit,12)??"days";return{type:"streak",count:n,label:a,unit:i,days:B(r,7,t,"days")}}import{jsx as Se,jsxs as zt}from"react/jsx-runtime";function Eu(e,t){if(e===1&&t.endsWith("s"))return t.slice(0,-1);return t}function _i({count:e,label:t,unit:n,days:r}){return zt("div",{className:"hb-card hb-streak",children:[zt("div",{className:"hb-streak-head",children:[zt("div",{children:[Se("div",{className:"hb-streak-label",children:t}),zt("div",{className:"hb-streak-count",children:[de(e,{digits:3})," ",Se("span",{children:Eu(e,n)})]})]}),Se("span",{className:"hb-streak-medal",children:Se(D,{name:"star",size:24,stroke:2.4})})]}),r.length>0&&Se("div",{className:"hb-streak-week",style:{gridTemplateColumns:`repeat(${r.length}, minmax(0, 1fr))`},children:r.map((o,a)=>zt("div",{className:o.today?"hb-streak-day hb-streak-today":"hb-streak-day",children:[Se("span",{className:"hb-streak-day-label",children:o.label}),o.done?Se("span",{className:"hb-streak-done",children:Se(D,{name:"check",size:15,stroke:2.6})}):Se("span",{className:"hb-streak-date",children:o.date??"·"}),Se("span",{className:"hb-streak-dot"})]},a))})]})}var Fu=8,Iu=30;function Wi(e,t){let n=I([e.rows,e.data])??[],r=pr(I([e.columns,e.headers,e.header])),o=n;if(!r.length){let c=n[0];if(Array.isArray(c))r=pr(c),o=n.slice(1);else if(c&&typeof c==="object")r=pr(Object.keys(c))}if(!r.length)return t.drop("table needs columns");r=B(r,Fu,t.at("columns"),"columns");let a=[];if(o.forEach((c,p)=>{let d=zu(c,r,t.at("rows").at(p));if(d)a.push(d)}),!a.length)t.drop("table has no rows");let i=B(a,Iu,t.at("rows"),"rows"),s=Ou(e.highlight,r,i,t.at("highlight")),l=f([e.caption,e.title],100);return w({type:"table",columns:r,rows:i,highlight:s,caption:l})}function pr(e){if(!e)return[];return e.map((t)=>{if(t&&typeof t==="object")return f([t.label,t.name,t.title],40)??"";return ge(t,40)??""})}function zu(e,t,n){let r;if(Array.isArray(e))r=e;else if(e&&typeof e==="object")r=Ru(e,t);else return n.drop("row is not a list of cells");if(r.length>t.length)return n.drop(`row has ${r.length} cells, table has ${t.length} columns`);let o=r.map(Pu);while(o.length<t.length)o.push("");return o}function Ru(e,t){let n=new Map(Object.entries(e).map(([r,o])=>[r.toLowerCase(),o]));return t.map((r)=>n.get(r.toLowerCase()))}function Pu(e){if(e===!0)return"Yes";if(e===!1)return"No";return ge(e,120)??""}function Ou(e,t,n,r){if(e===void 0||e===null)return;let o;if(M(e)!==null)o={row:e};else if(typeof e==="string")o=Du(e,t,n);else if(typeof e==="object"){if(M(e.row)!==null)o={row:e.row};let i=M(e.column)??M(e.col);if(!o&&i!==null)o={column:i}}if(!o){r.drop("highlight should be {row: n} or {column: n}");return}if(!("row"in o?Hi(o.row,n.length):Hi(o.column,t.length))){r.drop("highlight is outside the table");return}return o}function Du(e,t,n){let r=A(e)?.toLowerCase(),o=n.findIndex((i)=>i[0].toLowerCase()===r);if(o>=0)return{row:o};let a=t.findIndex((i)=>i.toLowerCase()===r);if(a>=0)return{column:a};return}function Hi(e,t){return Number.isInteger(e)&&e>=0&&e<t}import{useState as Ku}from"react";function Ee(e){let t=e.replace(/,/g,"").replace(/^−/,"-"),n=/^([-+]?)[^\d\-+]{0,3}([-+]?\d+(?:\.\d+)?)/.exec(t);if(!n)return null;let r=Number(n[2]);return n[1]==="-"?-r:r}function Ki(e,t){let n=e.map((o,a)=>a);if(!t)return n;let r=t.direction==="up"?1:-1;return n.sort((o,a)=>{let i=e[o][t.column]??"",s=e[a][t.column]??"";if(!i||!s)return _u(i,s);return r*Hu(i,s)})}function _u(e,t){if(!e&&!t)return 0;if(!e)return 1;return-1}function Hu(e,t){let n=Ee(e),r=Ee(t);if(n!==null&&r!==null)return n-r;return e.localeCompare(t,void 0,{numeric:!0,sensitivity:"base"})}function Vi(e,t){if(!e||e.column!==t)return{column:t,direction:"up"};if(e.direction==="up")return{column:t,direction:"down"};return null}function fn(e,t){let n=e.map((r)=>r[t]).filter((r)=>r);return n.length>0&&n.every((r)=>Ee(r)!==null)}function Gi(e,t){if(!fn(e,t)||!e.some((a)=>/^[-+−]/.test(a[t]??"")))return!1;let n=e.map((a)=>(a[t]??"").trim()).filter(Boolean),r=n.every((a)=>a.endsWith("%")),o=n.every((a)=>/^[-+−]/.test(a)||Ee(a)===0);return r||o}function Xi(e){let t=Ee(e);if(t===null||t===0)return null;return t>0?"up":"down"}function Ui(e,t){let n=t>0?Math.abs(e)/t*50:0;return{left:e<0?50-n:50,width:n}}var Wu=/^([-+−]?)([$₹€£¥]?)(\d{1,3}(?:,\d{2,3})+|\d+)(\.\d+)?$/;function ji(e){let t=Wu.exec(e.trim());if(!t)return null;let[,n,r,o,a=""]=t;if(!r&&!o.includes(","))return null;let i=Number(o.replace(/,/g,"")+a);if(i<xt)return null;let s=n==="-"||n==="−"?-i:i,l=r||void 0,c=n==="+"?"+":"";return{short:c+F(s,l),full:c+F(s,l,{full:!0})}}import{jsx as Q,jsxs as ht}from"react/jsx-runtime";var Vu=3;function Yi({columns:e,rows:t,highlight:n,caption:r}){let[o,a]=Ku(null),i=Ki(t,o),s=n&&"row"in n?n.row:-1,l=n&&"column"in n?n.column:-1,c=e.map((b,m)=>fn(t,m)),p=e.map((b,m)=>Gi(t,m)),d=e.map((b,m)=>p[m]?Xu(t,m):0),h=t.length>=Vu,u=(b,m,N="")=>[c[b]?"hb-num":"",b===0?"hb-first":"",b===l?"hb-best-col":"",m.length>28?"hb-wrap":"",N].filter(Boolean).join(" ");return ht("div",{className:"hb-card hb-table-card",children:[r&&Q("div",{className:"hb-chart-title hb-table-caption",children:Q(E,{text:r})}),Q("div",{className:"hb-table-scroll",children:ht("table",{className:e.length>=3?"hb-table hb-table-wide":"hb-table",children:[Q("thead",{children:Q("tr",{children:e.map((b,m)=>Q("th",{"aria-sort":ju(o,m),className:u(m,b,o?.column===m?"hb-sorted":""),children:ht("button",{type:"button",onClick:()=>a(Vi(o,m)),children:[Q("span",{children:b}),Q("span",{className:"hb-sort","aria-hidden":"true",children:Uu(o,m)}),m===l&&Q("span",{className:"hb-chip hb-chip-soft",children:"Best"})]})},m))})}),ht("tbody",{children:[!t.length&&Q("tr",{children:Q("td",{className:"hb-table-empty",colSpan:e.length,children:"No rows to show."})}),i.map((b)=>Q("tr",{className:b===s?"hb-best":void 0,children:t[b].map((m,N)=>{let y=ji(m),k=p[N]?Xi(m):null;return ht("td",{className:u(N,m,k?`hb-${k}`:""),title:y?.full,children:[p[N]&&h&&Q(Gu,{value:Ee(m)??0,largest:d[N]}),y?y.short:Q(E,{text:m}),N===0&&b===s&&Q("span",{className:"hb-chip hb-chip-soft",children:"Best"})]},N)})},b))]})]})})]})}function Gu({value:e,largest:t}){let{left:n,width:r}=Ui(e,t);return ht("span",{className:"hb-mini","aria-hidden":"true",children:[Q("span",{className:"hb-mini-zero"}),Q("span",{className:"hb-mini-bar",style:{left:`${n}%`,width:`${r}%`}})]})}function Xu(e,t){return Math.max(0,...e.map((n)=>Math.abs(Ee(n[t])??0)))}function Uu(e,t){if(!e||e.column!==t)return"↕";return e.direction==="up"?"↑":"↓"}function ju(e,t){if(!e||e.column!==t)return;return e.direction==="up"?"ascending":"descending"}var Yu=8,dr=120,qu=["title","label","name","caption","text"],Zu=["subtitle","value","text","caption","note","description"];function Ju(e){let t=wn(e,dr);if(t===e)return t;let n=e.slice(0,dr-1),r=n.search(/\s\S*$/);if(r>dr/2)return t;let o=n.slice(0,Math.max(r,0)).replace(/[\s,;:.–—-]+$/,"");return o?`${o}…`:""}function qi(e,t){let n=I([e.items,e.tiles]);if(!n)return t.drop("tiles needs items");let r=[];if(n.forEach((o,a)=>{let i=Qu(o);if(!i){t.at("items").at(a).drop("tile has no title");return}if(te(i.ask)||te(i.run)){t.at("items").at(a).drop(Xe);return}r.push(i)}),!r.length)return t.drop("tiles has no item with a title");return{type:"tiles",items:B(r,Yu,t,"tiles")}}function Qu(e){if(!e||typeof e!=="object")return null;let t=qu.find((o)=>A(e[o])!==void 0);if(!t)return null;let n=[];for(let o of Zu){let a=ge(e[o],1/0);if(o!==t&&a!==void 0)n.push(a)}let r=n.length?Ju(n.join(" · "))||void 0:void 0;return w({title:A(e[t],40),subtitle:r,image:G(e.image),icon:Re(e.icon),ask:A(e.ask,300),run:A(e.run,300)})}import{useContext as eh,useState as th}from"react";import{jsx as Fe,jsxs as Ji,Fragment as oh}from"react/jsx-runtime";var Zi=[1,4,8,3,6];function Qi({items:e}){return Fe("div",{className:"hb-tiles",children:e.map((t,n)=>Fe(rh,{tile:t,wash:Zi[n%Zi.length]},n))})}function nh(e,t,n){if(e.run)return()=>t(e.run);if(e.ask)return()=>n(e.ask);return}function rh({tile:e,wash:t}){let{send:n,fill:r}=eh(_),[o,a]=th(!1),i=nh(e,n,r),s=`var(--hb-chart-${t})`,l=Ji(oh,{children:[e.image&&!o&&Fe("img",{src:e.image,alt:"",loading:"lazy",referrerPolicy:"no-referrer",onError:()=>a(!0)}),e.icon&&Fe("span",{className:"hb-tile-icon",children:Fe(D,{name:e.icon,size:18,stroke:2.2})}),Ji("span",{className:"hb-tile-text",children:[Fe("span",{className:"hb-tile-title",children:e.title}),e.subtitle&&Fe("span",{className:"hb-tile-subtitle",children:e.subtitle})]})]}),c={background:`linear-gradient(140deg, ${s}, color-mix(in srgb, ${s} 55%, #140c24))`};return i?Fe("button",{type:"button",className:"hb-tile",onClick:i,title:e.run,style:c,children:l}):Fe("div",{className:"hb-tile hb-tile-static",style:c,children:l})}var es=12;function ts(e,t){let n=ah(e,t);if(!n)return t.drop("timeline needs groups");let r=[];if(n.forEach(({group:o,at:a})=>{let i=I([o?.items,o?.events,o?.stops,o?.steps]);if(!i){a.drop("group has no items list");return}let s=[];if(i.forEach((l,c)=>{let p=ih(l);if(!p){a.at("items").at(c).drop("stop has no title");return}s.push(p)}),!s.length){a.drop("group has no stop with a title");return}r.push({label:A(o.label,50)??"",items:B(s,12,a,"stops")})}),!r.length)return t.drop("timeline has no group with a stop");return w({type:"timeline",title:A(e.title,60),groups:B(r,14,t,"groups")})}function ah(e,t){if(Array.isArray(e.groups))return e.groups.map((r,o)=>({group:r,at:t.at("groups").at(o)}));let n=I([e.events,e.items,e.steps,e.stops]);if(!n)return null;return[{group:{label:"",items:n},at:t}]}function ih(e){if(!e||typeof e!=="object")return null;let t=f([e.title,e.name,e.label,e.activity,e.event],80),n=A(e.time,60),r=pe([e.note,e.text,e.description,e.detail],160);if(!t&&n&&n.length>es)t=n,n=void 0;if(!t)return null;return w({time:n?.slice(0,es),title:t,place:f([e.place,e.location],60),note:r,icon:Re(e.icon)})}import{jsx as bt,jsxs as Ie,Fragment as lh}from"react/jsx-runtime";var ur=(e)=>`${Math.round(e)}°`;function sh({counts:e}){let t=[];if(e.need){if(e.overdue)t.push(Ie("span",{className:"hb-brief-bad",children:[e.overdue," overdue"]},"o"));t.push(Ie("span",{children:[e.need," need you"]},"n"))}else t.push(bt("span",{children:"Nothing needs you today"},"n"));let n=e.handled?Ie("span",{className:"hb-brief-good",children:["✓ ",e.handled," handled"]}):null,r=t.flatMap((o,a)=>a?[", ",o]:[o]);return Ie("p",{className:"hb-brief-line",children:[r,n&&Ie(lh,{children:[", and ",n]}),"."]})}function ns({greeting:e,date:t,place:n,temp:r,condition:o,high:a,low:i,sky:s,counts:l}){let c=[a!==void 0?`H ${ur(a)}`:null,i!==void 0?`L ${ur(i)}`:null].filter(Boolean).join(" · ");return Ie("section",{className:`hb-brief hb-brief-${s}`,children:[Ie("div",{className:"hb-brief-top",children:[Ie("div",{className:"hb-brief-hello",children:[(t||n)&&bt("span",{className:"hb-brief-date",children:[t,n].filter(Boolean).join(" · ")}),bt("h2",{children:e})]}),r!==void 0&&Ie("div",{className:"hb-brief-wx",children:[bt("span",{className:"hb-brief-temp",children:ur(r)}),bt("span",{className:"hb-brief-sky",children:[o,c].filter(Boolean).join(" · ")})]})]}),bt(sh,{counts:l})]})}var ch=["clear","cloud","rain","snow","storm","fog","night"],hr=(e)=>{let t=M(e);return t!==null&&t>=0?Math.floor(t):0};function rs(e,t){let n=f([e.greeting],80);if(!n)return t.drop("briefing needs a greeting");let r=e.counts??{};return w({type:"briefing",greeting:n,date:f([e.date],40),place:f([e.place],60),temp:M(e.temp)??void 0,condition:f([e.condition],40),high:M(e.high)??void 0,low:M(e.low)??void 0,sky:ch.includes(e.sky)?e.sky:"clear",counts:{overdue:hr(r.overdue),need:hr(r.need),handled:hr(r.handled)}})}import{useContext as os,useState as ph}from"react";import{jsx as ze,jsxs as Rt}from"react/jsx-runtime";function dh({idea:e,group:t}){let{fill:n}=os(_),[r,o]=ph(!1);return Rt("button",{type:"button",className:"hb-prep-idea",onClick:()=>n(`Tell me more about ${e.title} for ${t}`),children:[!r&&ze("img",{src:e.photo,alt:"",loading:"lazy",onError:()=>o(!0)}),Rt("span",{className:"hb-prep-cap",children:[e.title,e.note&&ze("small",{children:e.note})]})]})}function uh({group:e}){let{fill:t}=os(_);return Rt("article",{className:"hb-prep-group",children:[Rt("div",{className:"hb-prep-head",children:[ze("span",{className:"hb-prep-title",children:e.title}),e.date&&ze("span",{className:"hb-prep-date",children:e.date})]}),ze("div",{className:"hb-prep-grid",children:e.ideas.map((n,r)=>ze(dh,{idea:n,group:e.title},r))}),e.ask&&ze("button",{type:"button",className:"hb-prep-ask",onClick:()=>t(e.ask.text),children:e.ask.label})]})}function as({groups:e}){return Rt("div",{className:"hb-prep",children:[ze("span",{className:"hb-prep-label",children:"Prepared for you"}),e.map((t,n)=>ze(uh,{group:t},n))]})}function is(e,t){let n=[];if((Array.isArray(e.groups)?e.groups:[]).slice(0,2).forEach((r,o)=>{let a=f([r?.title],60),i=(Array.isArray(r?.ideas)?r.ideas:[]).map((c)=>{let p=f([c?.title],40),d=G(c?.photo);if(!p||!d||te(p))return null;return w({title:p,note:f([c?.note],80),photo:d,link:G(c?.link)})}).filter(Boolean).slice(0,4);if(!a||i.length<2){t.at("groups").at(o).drop("a group needs a title and 2-4 ideas");return}let s=f([r?.ask?.label],40),l=f([r?.ask?.text],160);n.push(w({title:a,date:f([r?.date],30),ideas:i,ask:s&&l&&!te(l)?{label:s,text:l}:void 0}))}),!n.length)return t.drop("prepared has no group with ideas");return{type:"prepared",groups:n}}var hh=["overdue","today","soon","open"],bh=["closed","tracking","protected"],ss=(e,t,n)=>(Array.isArray(e)?e:[]).map((r)=>f([r],n)).filter((r)=>Boolean(r)).slice(0,t);function ls(e){if(!e||typeof e!=="object")return;let t=w({from:f([e.from],120),received:f([e.received],40),about:ss(e.about,4,60),trail:ss(e.trail,8,80)});return t.from||t.about.length||t.trail.length?t:void 0}function cs(e,t){let n=[];(Array.isArray(e.need)?e.need:[]).slice(0,20).forEach((o,a)=>{let i=f([o?.id],40),s=f([o?.title],80);if(!i||!s){t.at("need").at(a).drop("card needs an id and a title");return}let l=f([o?.help],120),c=G(o?.link?.url),p=f([o?.link?.label],40);n.push(w({id:i,title:s,amount:f([o?.amount],20),state:hh.includes(o?.state)?o.state:"open",stateText:f([o?.stateText],60),help:l&&!te(l)?l:void 0,link:c&&p?{label:p,url:c}:void 0,details:ls(o?.details)}))});let r=[];return(Array.isArray(e.handled)?e.handled:[]).slice(0,6).forEach((o,a)=>{let i=f([o?.id],40),s=f([o?.title],80);if(!i||!s||!bh.includes(o?.kind)){t.at("handled").at(a).drop("row needs an id, a title, a kind");return}r.push(w({id:i,title:s,amount:f([o?.amount],20),kind:o.kind,verb:f([o?.verb],30)??"",why:f([o?.why],120),reopen:o?.reopen===!0?!0:void 0,details:ls(o?.details)}))}),{type:"tracker",need:n,handled:r}}import{useContext as us,useEffect as fh,useState as br}from"react";import{jsx as U,jsxs as J,Fragment as mn}from"react/jsx-runtime";var ps="hermes-genui.tracker.view",fr="hermes-genui.tracker.handled";function mr(e){try{return localStorage.getItem(e)}catch{return null}}function ds(e,t){try{localStorage.setItem(e,t)}catch{}}function hs({d:e}){if(!e)return null;return J("details",{className:"hb-tr-details",children:[U("summary",{children:"Details"}),J("dl",{children:[e.from&&J(mn,{children:[U("dt",{children:"From"}),U("dd",{children:e.from})]}),e.received&&J(mn,{children:[U("dt",{children:"Received"}),U("dd",{children:e.received})]}),e.about.length>0&&J(mn,{children:[U("dt",{children:"About"}),U("dd",{children:e.about.join(" · ")})]}),e.trail.length>0&&J(mn,{children:[U("dt",{children:"So far"}),U("dd",{children:e.trail.join(" → ")})]})]})]})}function mh({card:e}){let{fill:t}=us(_);return J("article",{className:`hb-tr-card hb-tr-${e.state}`,children:[J("div",{className:"hb-tr-top",children:[U("span",{className:"hb-tr-title",children:e.title}),e.amount&&U("span",{className:"hb-tr-amount",children:e.amount})]}),e.stateText&&U("span",{className:`hb-tr-pill hb-tr-pill-${e.state}`,children:e.stateText}),(e.link||e.help)&&J("div",{className:"hb-tr-acts",children:[e.link&&J("a",{className:"hb-tr-go",href:e.link.url,target:"_blank",rel:"noreferrer",children:[e.link.label," ↗"]}),e.help&&U("button",{type:"button",className:"hb-tr-help",onClick:()=>t(e.help),children:e.help})]}),U(hs,{d:e.details})]})}function gh({row:e,onReopen:t}){return J("article",{className:`hb-tr-row hb-tr-${e.kind}`,children:[J("div",{className:"hb-tr-top",children:[J("span",{className:"hb-tr-title",children:[e.title,e.amount?` · ${e.amount}`:""]}),U("span",{className:"hb-tr-verb",children:e.kind==="closed"?`✓ ${e.verb}`:e.verb})]}),e.why&&U("span",{className:"hb-tr-why",children:e.why}),e.reopen&&U("button",{type:"button",className:"hb-tr-link",onClick:()=>t(e.id),children:"Reopen"}),U(hs,{d:e.details})]})}function bs({need:e,handled:t}){let{rest:n}=us(_),[r,o]=br(()=>mr(ps)==="done"?"done":"need"),[a,i]=br([]),[s,l]=br(!1),c=t.filter((u)=>!a.includes(u.id));fh(()=>{let u=Number(mr(fr));if(ds(fr,String(t.length)),mr(fr)!==null&&Number.isFinite(u)&&t.length>u&&u>0)l(!0)},[t.length]);let p=(u)=>{o(u),ds(ps,u)},d=(u)=>{i((b)=>[...b,u]),n?.(`/assistant/items/${u}`,{method:"POST",body:{status:"suggested"}})},h=e.some((u)=>u.state==="overdue");return J("div",{className:"hb-tr",children:[J("div",{className:"hb-tr-switch",role:"tablist","aria-label":"Needs you or handled",children:[J("button",{type:"button",role:"tab","aria-selected":r==="need",onClick:()=>p("need"),children:["Needs you ",U("span",{className:`hb-tr-badge${h?" hb-tr-badge-red":""}`,children:e.length})]}),J("button",{type:"button",role:"tab","aria-selected":r==="done",onClick:()=>p("done"),children:["Handled ",J("span",{className:`hb-tr-badge hb-tr-badge-green${s?" hb-tr-pulse":""}`,children:["✓ ",c.length]})]})]}),U("div",{className:"hb-tr-list",role:"tabpanel",children:r==="need"?e.length?e.map((u)=>U(mh,{card:u},u.id)):U("p",{className:"hb-tr-empty",children:"Nothing needs you right now."}):c.length?c.map((u)=>U(gh,{row:u,onReopen:d},u.id)):U("p",{className:"hb-tr-empty",children:"When a payment, renewal or delivery mail arrives, it lands here with the reason."})})]})}import{jsx as Te,jsxs as ft}from"react/jsx-runtime";function fs({title:e,groups:t}){return ft("div",{className:"hb-card hb-timeline",children:[e&&Te("div",{className:"hb-card-title",children:e}),t.map((n,r)=>ft("div",{className:"hb-timeline-group",children:[n.label&&Te("span",{className:"hb-chip hb-chip-soft",children:n.label}),n.items.map((o,a)=>{let i=a===n.items.length-1;return ft("div",{className:"hb-stop",children:[Te("span",{className:"hb-stop-time",children:o.time??""}),ft("span",{className:"hb-stop-rail",children:[Te("span",{className:"hb-stop-dot",children:o.icon?Te(D,{name:o.icon,size:12,stroke:2.4}):Te("span",{className:"hb-stop-pip"})}),!i&&Te("span",{className:"hb-stop-line"})]}),ft("div",{className:i?"hb-stop-body":"hb-stop-body hb-stop-body-gap",children:[Te("div",{className:"hb-stop-title",children:o.title}),o.place&&ft("div",{className:"hb-stop-place",children:[Te(D,{name:"pin",size:12,stroke:2.2}),o.place]}),o.note&&Te("div",{className:"hb-stop-note",children:o.note})]})]},a)})]},r))]})}import{jsx as z}from"react/jsx-runtime";var mt={chart:{read:la,Component:({block:e})=>z(Jt,{spec:e.spec})},kpis:{read:Qa,Component:({block:e})=>z(qa,{items:e.items})},source:{read:Ii,Component:({block:e})=>z(un,{text:e.text,url:e.url})},timeline:{read:ts,Component:({block:e})=>z(fs,{...e})},images:{read:Xa,Component:({block:e})=>z(Ga,{block:e})},callout:{read:sa,Component:({block:e})=>z(Qo,{...e})},calendar:{read:Zo,Component:({block:e})=>z(jo,{...e})},upnext:{read:ra,Component:({block:e})=>z(na,{...e})},weather:{read:ia,Component:({block:e})=>z(aa,{...e})},briefing:{read:rs,Component:({block:e})=>z(ns,{...e})},tracker:{read:cs,Component:({block:e})=>z(bs,{...e})},prepared:{read:is,Component:({block:e})=>z(as,{...e})},table:{read:Wi,Component:({block:e})=>z(Yi,{...e})},list:{read:xi,Component:({block:e})=>z(pi,{...e})},progress:{read:ki,Component:({block:e})=>z(yi,{...e})},streak:{read:Di,Component:({block:e})=>z(_i,{...e})},heatmap:{read:Ka,Component:({block:e})=>z(_a,{...e})},flip:{read:ya,Component:({block:e})=>z(xa,{...e})},flow:{read:Sa,Component:({block:e})=>z(Ca,{...e})},steps:{read:zi,Component:({block:e})=>z(Oi,{...e})},layers:{read:gi,Component:({block:e})=>z(mi,{...e})},heading:{read:Vr,Component:({block:e})=>z(Pr,{text:e.text})},text:{read:Gr,Component:({block:e})=>z(Or,{text:e.text})},stat:{read:ei,Component:({block:e})=>z(nr,{item:e})},divider:{read:Xr,Component:()=>z(Dr,{})},badge:{read:Ur,Component:({block:e})=>z(_r,{...e})},link:{read:jr,Component:({block:e})=>z(Hr,{...e})},image:{read:Yr,Component:({block:e})=>z(Wr,{...e})},bar:{read:qr,Component:({block:e})=>z(Kr,{...e})},actions:{read:Lr,Component:({block:e})=>z(Ar,{items:e.items})},button:{read:Er,Component:({block:e})=>z($r,{...e})},tiles:{read:qi,Component:({block:e})=>z(Qi,{items:e.items})},checklist:{read:fa,Component:({block:e})=>z(ha,{...e})},calculator:{read:Uo,Component:({block:e})=>z(Xo,{...e})},simulate:{read:wi,Component:({block:e})=>z(Fi,{...e})},form:{read:Ba,Component:({block:e})=>z(Pa,{...e})},row:{read:Bt,Component:({block:e,draw:t})=>z(ti,{kinds:e.children.map((n)=>n.type),children:t(e.children)})},section:{read:Bt,Component:({block:e,draw:t})=>z(oi,{title:e.title,collapsed:e.collapsed,children:t(e.children)})},grid:{read:Bt,Component:({block:e,draw:t})=>z(ni,{children:t(e.children)})},columns:{read:Bt,Component:({block:e,draw:t})=>z(ri,{children:t(e.children)})},tabs:{read:or,Component:({block:e,draw:t})=>z(ii,{labels:e.tabs.map((n)=>n.label),badges:e.tabs.map((n)=>n.badge),panel:(n)=>t(e.tabs[n].children)})}};import{jsx as gn}from"react/jsx-runtime";function xh({block:e}){let t=mt[e.type];if(!t)return null;let{Component:n}=t;return gn(n,{block:e,draw:ms})}function ms(e){return e.map((t,n)=>gn(xh,{block:t},n))}function xn({blocks:e}){return gn("div",{className:"hb-blocks",children:gn(Sr,{children:ms(e)})})}var H1=Object.keys(mt);function yh(e){let t=e;if(gr(t)&&Array.isArray(t.blocks))t=t.blocks;if(gr(t)&&typeof t.type==="string")t=[t];let n=new Pt,r=[];if(Array.isArray(t))t.forEach((o,a)=>{r.push(...gs(o,n.at(a),0))});return{blocks:r,dropped:n.dropped}}function yn(e){return yh(e).blocks}function gr(e){return e!==null&&typeof e==="object"&&!Array.isArray(e)}function gs(e,t,n){if(!gr(e))return t.drop("not a block object"),[];let r=e.type,o=Object.hasOwn(mt,r)?mt[r]:void 0;if(!o)return t.drop(`unknown type "${r}"`),[];let a=o.read(e,t,n,gs);if(!a)return[];return Array.isArray(a)?a:[a]}import{jsx as gt}from"react/jsx-runtime";var Nh=/^[0-9a-f]{8}$/;function xs({id:e,streaming:t,load:n}){let r=typeof e==="string"&&Nh.test(e),o=kh(_),[a,i]=wh({kind:"loading"});if(vh(()=>{if(t||!r)return;let s=!0;return n(e).then((l)=>{let c=yn(l);if(s)i(c.length?{kind:"drawn",blocks:c}:{kind:"failed"})}).catch(()=>{if(s)i({kind:"failed"})}),()=>{s=!1}},[e,t,r]),!r&&!t)return gt(xr,{text:"Couldn't load this block"});if(t||a.kind==="loading")return gt(xr,{text:"drawing…",pulse:!0});if(a.kind==="failed")return gt(xr,{text:"Couldn't load this block"});return gt(_.Provider,{value:{...o,blockId:e},children:gt(xn,{blocks:a.blocks})})}function xr({text:e,pulse:t=!1}){return gt("div",{className:t?"hb-state hb-pulse":"hb-state",children:e})}import{useCallback as Sh,useEffect as ks,useRef as vs,useState as ws}from"react";import{jsx as kn,jsxs as yr}from"react/jsx-runtime";function Ch(e,t=new Date){let n=new Date(e),r=n.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});if(n.toDateString()===t.toDateString())return r;return`${n.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})}, ${r}`}function ys({label:e,at:t,refreshing:n,error:r,schedule:o,onRefresh:a}){return yr("div",{className:"hb-refresh",role:"status",children:[kn("span",{className:"hb-refresh-label",children:e}),kn("span",{className:"hb-refresh-when",children:t?`updated ${Ch(t)}`:"not filled yet"}),o&&yr("span",{className:"hb-refresh-when",children:["· refreshes ",o]}),r&&kn("span",{className:"hb-refresh-error",children:r}),yr("button",{type:"button",className:"hb-refresh-button",disabled:n,onClick:a,"aria-label":n?"Refreshing":`Refresh ${e}`,children:[kn("span",{"aria-hidden":"true",children:"↻"})," ",n?"Refreshing…":"Refresh"]})]})}import{jsx as et,jsxs as Ns}from"react/jsx-runtime";function Th(e){if(e.snapshots)return e.snapshots;if(e.at!==void 0||e.refreshing!==void 0)return{at:e.at??null,refreshing:Boolean(e.refreshing),error:e.error??null,schedule:e.schedule??null};return null}var Mh=[{type:"callout",tone:"info",text:"No dashboard yet. Ask Hermes: “Create my personal dashboard”, or “put my bills and NVDA on my Today page”."}];function kr(e,t={}){if(Array.isArray(e))e.forEach((n)=>kr(n,t));else if(e&&typeof e==="object"){let n=e;if(n.type==="checklist"&&typeof n.path==="string"&&Array.isArray(n.items))t[n.path]=n.items.map((r)=>r.id);Object.values(e).forEach((r)=>{if(r&&typeof r==="object")kr(r,t)})}return t}function Bh(e){let t=JSON.stringify(e),n=0;for(let r=0;r<t.length;r+=1)n=n*31+t.charCodeAt(r)|0;return(n>>>0).toString(36)}function vr({load:e,fill:t,saveTicks:n,post:r,refreshNow:o=0,refresh:a,refreshLabel:i="Snapshot"}){let[s,l]=ws(null),[c,p]=ws(!1),d=vs(!1),h=vs({}),u=Sh(async()=>{try{let y=await e();if(!y)return;p(!1);let k=Th(y);d.current=Boolean(y.live)||Boolean(k?.refreshing),l({title:y.title,greeting:y.greeting??null,blocks:yn(y.title?y.blocks:Mh),live:d.current,at:new Date,snapshot:k})}catch{p(!0)}},[e]);if(ks(()=>{if(o)u()},[o,u]),ks(()=>{let y=!1,k,S=async()=>{if(!(typeof document<"u"&&document.hidden))await u();if(!y)k=setTimeout(S,d.current?5000:30000)};return S(),()=>{y=!0,clearTimeout(k)}},[u]),!s)return et("div",{className:"hb-blocks hb-dash",children:et("p",{className:"hb-dash-sub",children:c?"This page isn't in this profile. Switch back to the profile it was made in, or ask Hermes to make it here.":"Loading…"})});let b=kr(s.blocks),m=Bh(b),N=async(y,k)=>{if(k?.method==="POST"&&r&&y.startsWith("/assistant/items/"))try{return await r(y,k)}finally{u()}if(k?.method!=="PUT")return{};let S=k.body?.state??{},x={};for(let[v,C]of Object.entries(S)){let T=Array.isArray(C)?C:[],L=new Set(h.current[`${m}:${v}`]??[]),R=new Set(T);(b[v]??[]).forEach((V,j)=>{if(V&&L.has(j)!==R.has(j))x[V]=R.has(j)}),h.current[`${m}:${v}`]=T}if(Object.keys(x).length)await n(x);return{ok:!0}};return Ns("div",{className:"hb-blocks hb-dash",children:[s.blocks[0]?.type!=="briefing"&&Ns("header",{className:"hb-dash-head",children:[et("div",{className:"hb-dash-date",children:s.at.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})}),et("h1",{children:s.greeting??s.title??"Today"})]}),a&&s.snapshot&&et(ys,{label:i,...s.snapshot,onRefresh:async()=>{l((y)=>y?{...y,snapshot:{...y.snapshot,refreshing:!0,error:null}}:y);try{await a()}finally{u()}}}),et(_.Provider,{value:{send:t,fill:t,rest:N,blockId:`dashboard-${m}`},children:et(xn,{blocks:s.blocks},m)})]})}function Cs(e,t){let n=new Map;return(r)=>{let o=new Map(r.filter((a)=>a.kind==="dashboard"&&/^[a-z0-9-]{1,40}$/.test(a.slug)).map((a)=>[a.slug,a.title]));for(let[a,i]of n)if(o.get(a)!==i.title)i.off.forEach((s)=>s()),n.delete(a);for(let[a,i]of o){if(n.has(a))continue;let s=`/genui-board/${a}`;n.set(a,{title:i,off:[e({id:`hermes-genui-page-${a}`,area:"routes",title:i,data:{path:s},render:()=>t(a)}),e({id:`hermes-genui-page-${a}-nav`,area:"sidebar.nav",data:{codicon:"dashboard",label:i,path:s}})]})}}}import{jsx as Ts}from"react/jsx-runtime";var Ah=5000,Ss="/genui-today";function Ms(e,t){let n=!1,r=null;e.register({id:"hermes-genui-today",area:"routes",title:"Today",data:{path:Ss},render:()=>Ts(vr,{fill:t,load:()=>e.rest("/dashboard"),post:(c,p)=>e.rest(c,p),saveTicks:async(c)=>{await e.rest("/dashboard/state",{method:"PUT",body:{ticks:c}})},refresh:async()=>{await e.rest("/pages/today/refresh",{method:"POST"})},refreshLabel:"Work sections"})});let o=()=>{if(n&&!r)r=e.register({id:"hermes-genui-today-nav",area:"sidebar.nav",data:{codicon:"pulse",label:"Today",path:Ss}});else if(!n&&r)r(),r=null},a=async()=>{try{let c=await e.rest("/dashboard/head");n=Boolean(c?.title),o()}catch{n=!1,o()}},i=Cs(e.register,(c)=>Ts(vr,{fill:t,load:()=>e.rest(`/pages/${c}`),saveTicks:async()=>{},refresh:async()=>{await e.rest(`/pages/${c}/refresh`,{method:"POST"})}})),s=async()=>{try{let c=await e.rest("/pages");if(Array.isArray(c?.pages))i(c.pages)}catch{i([])}},l=()=>Promise.all([a(),s()]);l(),e.setInterval(()=>{if(typeof document<"u"&&document.hidden)return;l()},Ah)}var $h=(e)=>new Promise((t)=>setTimeout(t,e));async function Bs(e,t){try{return Boolean(await e.composer?.insertText(null,t,{mode:"block"}))}catch{return!1}}async function As(e,t,{waitMs:n=2000,stepMs:r=100}={}){let o=await Bs(t,e);if(!o&&t.navigate){t.navigate("/");for(let a=0;!o&&a<n;a+=r)await $h(r),o=await Bs(t,e)}if(o)t.composer?.focus(null);return o}var $s=`/* Restyled for log: these are log's Lynx kit tokens (src/mcp/apps/report/view/kit.css, after
   https://github.com/yakkomajuri/lynx, MIT), not upstream hermes-genui's look. A quiet canvas, plain blocks on a
   white surface with one hairline, a near-black accent, big light numbers and Geist. Every class still starts with
   hb- so nothing leaks into the app; Hermes puts .dark on the page for dark mode. */
.hb-blocks {
  --hb-ink: #0f1115;
  --hb-ink-2: #3a3f47;
  --hb-muted: #6b7280;
  --hb-line: rgba(15, 23, 42, 0.075);
  --hb-line-strong: rgba(15, 23, 42, 0.14);
  --hb-card: #ffffff;
  --hb-well: #f7f8fa;
  --hb-accent: #16181d;
  --hb-accent-soft: rgba(15, 23, 42, 0.07);
  --hb-accent-ink: #16181d;
  --hb-good: #0f9d6c;
  --hb-warn: #b26a00;
  --hb-surface: #ffffff;
  --hb-shadow: 0 1px 2px rgba(15, 23, 42, 0.05), 0 12px 32px rgba(15, 23, 42, 0.1);
  --hb-radius: 16px;
  --hb-font: 'Geist', ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  /* Lynx keeps charts nearly monochrome: the accent first, then log's kit palette. */
  --hb-chart-1: #16181d;
  --hb-chart-2: #2563eb;
  --hb-chart-3: #0f9d6c;
  --hb-chart-4: #7c4dff;
  --hb-chart-5: #9aa0a9;
  --hb-chart-6: #d93025;
  --hb-chart-7: #b26a00;
  --hb-chart-8: #6b7280;

  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 8px 0;
  max-width: 1100px;
  color: var(--hb-ink);
  font-family: var(--hb-font);
  font-size: 14px;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
}
.dark .hb-blocks {
  --hb-ink: #f1f2f4;
  --hb-ink-2: #c9ccd2;
  --hb-muted: #9095a0;
  --hb-line: rgba(255, 255, 255, 0.075);
  --hb-line-strong: rgba(255, 255, 255, 0.15);
  --hb-card: #1e2023;
  --hb-well: #24262a;
  --hb-accent: #eceef1;
  --hb-accent-soft: rgba(255, 255, 255, 0.09);
  --hb-accent-ink: #eceef1;
  --hb-good: #3ccf91;
  --hb-warn: #e6b450;
  --hb-surface: #1e2023;
  --hb-shadow: 0 0 0 1px rgba(255, 255, 255, 0.07), 0 12px 32px rgba(0, 0, 0, 0.5);
  --hb-chart-1: #eceef1;
  --hb-chart-2: #6ea2ff;
  --hb-chart-3: #3ccf91;
  --hb-chart-4: #a78bfa;
  --hb-chart-5: #6d717a;
  --hb-chart-6: #f26b60;
  --hb-chart-7: #e6b450;
  --hb-chart-8: #9095a0;
}
.hb-blocks * { box-sizing: border-box; }
.hb-blocks { overflow-wrap: break-word; }
.hb-blocks img, .hb-blocks figure, .hb-blocks table { margin: 0; }
`;var Ls=`/* Pieces several blocks share: cards, chips, pill buttons and the motion they use. */
/* Cards */
.hb-card {
  background: var(--hb-card);
  border: 1px solid var(--hb-line);
  border-radius: 16px;
  padding: 14px 16px;
}
.hb-card-title {
  font-size: 16px;
  line-height: 22px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
/* Chips */
.hb-chip {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 4px;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.hb-chip-soft { background: var(--hb-accent-soft); color: var(--hb-accent-ink); }
.hb-chip-good { background: color-mix(in srgb, var(--hb-good) 14%, transparent); color: var(--hb-good); }
.hb-chip-warn { background: color-mix(in srgb, var(--hb-warn) 13%, transparent); color: var(--hb-warn); }
.hb-chip-plain { background: var(--hb-well); color: var(--hb-ink-2); }
/* Pill buttons that act (actions, button, a form's Send): soft for buttons in a reply, solid for a form's Send. */
.hb-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  max-width: 100%;
  padding: 7px 14px;
  border: 0;
  border-radius: 999px;
  background: var(--hb-accent-soft);
  color: var(--hb-accent-ink);
  font: inherit;
  font-size: 13.5px;
  font-weight: 600;
  line-height: 18px;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
}
.hb-pill svg { flex: none; }
.hb-pill:hover { background: color-mix(in srgb, var(--hb-accent) 22%, transparent); }
.hb-pill:active { transform: scale(0.97); }
.hb-pill:focus-visible { outline: 2px solid var(--hb-accent); outline-offset: 2px; }
.hb-pill-solid { background: var(--hb-accent); color: #fff; }
.hb-pill-solid:hover { background: color-mix(in srgb, var(--hb-accent) 86%, #000); }
.hb-pill:disabled { opacity: 0.45; cursor: default; transform: none; }
.hb-pill-solid:disabled:hover { background: var(--hb-accent); }
/* Motion: a panel appearing (section, tabs, photo overlay) and a bar growing (bar, progress). */
.hb-appear { animation: hb-appear 0.22s cubic-bezier(0.2, 0.8, 0.2, 1); }
@keyframes hb-appear { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
@keyframes hb-grow { from { transform: scaleX(0); } }
@media (prefers-reduced-motion: reduce) {
  .hb-pill { transition: none; }
  .hb-appear { animation: none; }
}
`;var Es=`/* The block tag's own states */
.hb-state {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0;
  padding: 10px 14px;
  max-width: 100%;
  border-radius: 14px;
  background: color-mix(in srgb, var(--foreground, #1f2328) 5%, transparent);
  color: var(--ui-text-tertiary, #6b7280);
  font-size: 13px;
}
.hb-pulse { animation: hb-pulse 1.2s ease-in-out infinite; }
@keyframes hb-pulse { 50% { opacity: 0.45; } }
@media (prefers-reduced-motion: reduce) {
  .hb-pulse { animation: none; }
}
`;var Fs=`/* Small pieces: heading, text, divider, badge, link, image, bar */
.hb-heading { font-size: 16px; line-height: 22px; font-weight: 700; letter-spacing: -0.01em; margin-top: 4px; }
.hb-text { color: var(--hb-ink-2); }
.hb-text strong { color: var(--hb-ink); font-weight: 650; }
.hb-divider { height: 1px; background: var(--hb-line); margin: 2px 0; }

.hb-badge { display: flex; align-items: center; }
.hb-link a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--hb-accent-ink);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.hb-image { margin: 0; display: flex; flex-direction: column; gap: 6px; }
.hb-image img {
  display: block;
  width: 100%;
  max-height: 300px;
  object-fit: cover;
  border: 1px solid var(--hb-line);
  border-radius: 16px;
  background: var(--hb-well);
}
.hb-image figcaption { padding: 0 4px; font-size: 12px; line-height: 16px; color: var(--hb-muted); }
.hb-bar { display: flex; flex-direction: column; justify-content: center; gap: 6px; padding: 11px 14px; }
.hb-bar-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 8px; font-size: 13px; }
.hb-bar-label { flex: 1 0 auto; font-weight: 600; color: var(--hb-ink-2); }
.hb-bar-amount { color: var(--hb-muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
.hb-bar-track { height: 8px; border-radius: 999px; background: var(--hb-accent-soft); overflow: hidden; }
.hb-bar-fill { display: block; height: 100%; border-radius: 999px; background: var(--hb-accent); }
.hb-bar-fill { transform-origin: left; animation: hb-grow 0.9s cubic-bezier(0.2, 0.8, 0.2, 1); }
@media (prefers-reduced-motion: reduce) {
  .hb-bar-fill { animation: none; }
}
`;var Is=`.hb-source { font-size: 11.5px; color: var(--hb-muted); }
.hb-source a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
`;var zs=`.hb-callout strong { color: var(--hb-ink); font-weight: 650; }
.hb-callout {
  display: flex;
  gap: 10px;
  padding: 11px 14px;
  border-radius: 14px;
  font-size: 13.5px;
  line-height: 19px;
}
.hb-callout-icon { flex: none; margin-top: 1px; }
.hb-callout-body { min-width: 0; color: var(--hb-ink-2); }
.hb-callout-title { font-weight: 700; color: var(--hb-ink); }
.hb-callout-info { background: var(--hb-accent-soft); }
.hb-callout-info .hb-callout-icon { color: var(--hb-accent-ink); }
.hb-callout-tip { background: color-mix(in srgb, var(--hb-good) 11%, transparent); }
.hb-callout-tip .hb-callout-icon { color: var(--hb-good); }
.hb-callout-warn { background: color-mix(in srgb, var(--hb-warn) 10%, transparent); }
.hb-callout-warn .hb-callout-icon { color: var(--hb-warn); }
`;var Rs=`/* Headline numbers */
/* Cards keep a readable width (130-200px) instead of stretching across a wide chat. */
.hb-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 200px));
  gap: 8px;
}
.hb-kpi { display: flex; flex-direction: column; gap: 2px; min-width: 0; padding: 10px 12px; }
.hb-kpi-label { font-size: 12px; font-weight: 500; color: var(--hb-muted); }
.hb-kpi-value {
  font-size: 22px;
  line-height: 1.2;
  font-weight: 650;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
.hb-kpi-value-text { font-size: 15px; font-weight: 700; }
.hb-kpi-change { font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; }
.hb-kpi-up { color: var(--hb-good); }
.hb-kpi-down { color: var(--hb-warn); }
.hb-kpi-flat { color: var(--hb-muted); }
.hb-kpi-spark { display: block; width: 100%; height: 28px; margin-top: 6px; overflow: visible; }
.hb-kpi-spark path {
  fill: none;
  stroke: var(--hb-chart-1);
  stroke-width: 1.75;
  stroke-linejoin: round;
  stroke-linecap: round;
  vector-effect: non-scaling-stroke;
}
`;var Ps=`/* Timeline */
.hb-timeline { display: flex; flex-direction: column; gap: 14px; }
.hb-timeline-group { display: flex; flex-direction: column; }
.hb-timeline-group > .hb-chip { margin-bottom: 10px; }
.hb-stop { display: grid; grid-template-columns: 46px 22px 1fr; column-gap: 8px; }
.hb-stop-time {
  padding-top: 2px;
  text-align: right;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--hb-muted);
  font-variant-numeric: tabular-nums;
}
.hb-stop-rail { display: flex; flex-direction: column; align-items: center; }
.hb-stop-dot {
  display: grid;
  place-items: center;
  flex: none;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: var(--hb-accent-soft);
  color: var(--hb-accent-ink);
}
.hb-stop-pip { width: 6px; height: 6px; border-radius: 999px; background: var(--hb-accent); }
.hb-stop-line { flex: 1; width: 1px; margin: 4px 0; background: var(--hb-line); }
.hb-stop-body { min-width: 0; }
.hb-stop-body-gap { padding-bottom: 14px; }
.hb-stop-title { font-size: 14.5px; line-height: 21px; font-weight: 600; }
.hb-stop-place {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 1px;
  font-size: 12.5px;
  color: var(--hb-muted);
}
.hb-stop-note { margin-top: 3px; font-size: 13px; line-height: 18px; color: var(--hb-ink-2); }
`;var Os=`/* Containers. A row's small cards (stats, badges) end at the same height; a tall block never sits in a row
   (layout/read.ts draws that row as a stack). */
.hb-row { display: flex; flex-wrap: wrap; align-items: stretch; gap: 8px; }
.hb-row-cell { flex: 1 1 140px; min-width: 0; display: flex; flex-direction: column; }
.hb-row-cell > * { flex: 1; }
/* Grid: each cell keeps its block's own height, top-aligned in its row. */
.hb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; align-items: start; }
.hb-grid-cell { min-width: 0; display: flex; flex-direction: column; }
.hb-row-cell-own { flex: none; align-self: center; }
.hb-section { display: flex; flex-direction: column; gap: 8px; }
.hb-section-body { display: flex; flex-direction: column; gap: 10px; }
.hb-section .hb-card { background: var(--hb-well); border-color: transparent; }
.hb-section-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.hb-section-toggle .hb-card-title { flex: 1; min-width: 0; }
.hb-chevron { flex: none; color: var(--hb-muted); transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1); }
.hb-chevron-open { transform: rotate(90deg); }
/* Tabs: underlined tab buttons in a bar that scrolls sideways when they don't fit, above one panel of blocks. */
.hb-tabs { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.hb-tab-bar {
  display: flex;
  gap: 2px;
  overflow-x: auto;
  scrollbar-width: none;
  border-bottom: 1px solid var(--hb-line);
}
.hb-tab-bar::-webkit-scrollbar { display: none; }
.hb-tab {
  flex: none;
  margin-bottom: -1px;
  padding: 7px 12px 8px;
  border: 0;
  border-bottom: 2px solid transparent;
  border-radius: 8px 8px 0 0;
  background: none;
  color: var(--hb-muted);
  font: inherit;
  font-size: 13.5px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.hb-tab:hover { color: var(--hb-ink-2); background: var(--hb-well); }
.hb-tab-on, .hb-tab-on:hover { color: var(--hb-accent-ink); border-bottom-color: var(--hb-accent); background: none; }
.hb-tab:focus-visible { outline: 2px solid var(--hb-accent); outline-offset: -2px; }
.hb-tab-badge { display: inline-block; min-width: 18px; margin-left: 6px; padding: 0 5px; border-radius: 99px;
  background: var(--hb-well); color: var(--hb-ink-2); font-size: 11px; line-height: 18px; text-align: center;
  font-variant-numeric: tabular-nums; vertical-align: 1px; }
.hb-tab-on .hb-tab-badge { background: var(--hb-accent); color: #fff; }
.hb-tab-panel { display: flex; flex-direction: column; gap: 10px; min-width: 0; }

/* Columns: dashboards side by side, each block at its own height (a short card beside a tall one stays short). */
.hb-columns { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(380px, 100%), 1fr)); gap: 10px; align-items: start; }
.hb-column { min-width: 0; display: flex; flex-direction: column; gap: 10px; }
/* Beside other blocks a table's card fills its column or cell (on its own it hugs its columns). */
:is(.hb-column, .hb-grid-cell) > .hb-table-card { width: auto; }
`;var Ds=`/* Charts are drawn at their real width and fill their place inside a layout block (a column, a cell, a tab). At the
   top of a reply they stop at 720px; a long line (60+ points) takes the board's full width. */
.hb-chart { margin: 0; padding: 14px 16px 10px; }
.hb-blocks > .hb-chart:not(.hb-chart-wide) { max-width: 720px; }
.hb-chart-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.hb-chart-title {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
  color: var(--hb-muted);
}
.hb-chart-figure { display: flex; align-items: baseline; gap: 8px; margin-top: 2px; min-width: 0; }
.hb-chart-big {
  font-size: 28px;
  line-height: 1.15;
  font-weight: 800;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}
.hb-chart-at {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--hb-muted);
  font-variant-numeric: tabular-nums;
}
.hb-chart-other { margin-left: 8px; }
.hb-chart-plot { position: relative; margin-top: 8px; }
.hb-chart-svg { display: block; width: 100%; overflow: visible; touch-action: none; user-select: none; }
.hb-chart-svg:focus-visible, .hb-pie-svg:focus-visible, .hb-hbar-grid:focus-visible {
  outline: 2px solid var(--hb-accent);
  outline-offset: 4px;
  border-radius: 4px;
}
.hb-chart-source { margin-top: 2px; text-align: right; font-size: 11px; color: var(--hb-muted); }

/* Marks and text inside the drawings */
.hb-chart-axis, .hb-chart-tick { font-size: 11px; fill: var(--hb-muted); font-variant-numeric: tabular-nums; }
.hb-chart-value { font-size: 11.5px; font-weight: 500; fill: var(--hb-ink-2); font-variant-numeric: tabular-nums; }
.hb-chart-end { font-size: 11.5px; font-weight: 600; fill: var(--hb-ink); font-variant-numeric: tabular-nums; }
/* Text drawn over lines (a change line's Start label): a rim of the page's colour behind the letters. */
.hb-chart-halo { paint-order: stroke; stroke: var(--hb-surface); stroke-width: 3px; stroke-linejoin: round; }
.hb-chart-rule { stroke: var(--hb-line); }
.hb-chart-rule-strong { stroke: var(--hb-line-strong); }
.hb-chart-dot { stroke: var(--hb-surface); stroke-width: 2; }
.hb-chart-svg g, .hb-hbar-bar { transition: opacity 0.15s; }
.hb-chart-draw { animation: hb-chart-draw 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
@keyframes hb-chart-draw { to { stroke-dashoffset: 0; } }

/* The hover card (ChartTip) */
.hb-tip {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 120px;
  padding: 8px 10px;
  border: 1px solid var(--hb-line);
  border-radius: 8px;
  background: var(--hb-surface);
  box-shadow: var(--hb-shadow);
  color: var(--hb-ink);
  font-size: 12.5px;
  line-height: 1.35;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 120ms ease;
}
.hb-tip-on { opacity: 1; }
.hb-tip-title, .hb-tip-note { font-size: 11.5px; color: var(--hb-muted); }
.hb-tip-row { display: flex; align-items: center; gap: 8px; }
.hb-tip-row i { flex: none; width: 8px; height: 8px; border-radius: 2px; }
.hb-tip-name { flex: 1; color: var(--hb-ink-2); }
.hb-tip-value { margin-left: 12px; font-weight: 600; }

@media (prefers-reduced-motion: reduce) {
  .hb-chart-draw { animation: none; stroke-dashoffset: 0; }
  .hb-tip, .hb-chart-svg g, .hb-hbar-bar, .hb-slice, .hb-pie-legend tr { transition: none; }
}

.hb-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-top: 6px;
  font-size: 12px;
  line-height: 16px;
  color: var(--hb-muted);
}
.hb-legend-item { display: inline-flex; align-items: center; gap: 6px; }
.hb-legend-dot { flex: none; width: 10px; height: 10px; border-radius: 999px; }
.hb-legend-value { color: var(--hb-ink-2); font-variant-numeric: tabular-nums; }

/* Pie and donut: the legend sits beside the drawing from 440px wide, below it when narrower. It stops at 420px so
   amounts stay near their names when the donut fills a wide section. */
.hb-pie { container-type: inline-size; }
.hb-pie-body { position: relative; display: flex; flex-direction: column; gap: 14px; margin-top: 10px; }
@container (min-width: 440px) {
  .hb-pie-body { flex-direction: row; align-items: center; gap: 20px; }
  .hb-pie-body .hb-pie-svg { margin: 0; }
}
.hb-pie-svg { display: block; flex: none; margin: 0 auto; user-select: none; }
.hb-pie-total { font-size: 17px; font-weight: 650; fill: var(--hb-ink); font-variant-numeric: tabular-nums; }
.hb-slice { cursor: pointer; stroke: var(--hb-surface); stroke-width: 2; stroke-linejoin: round; transition: opacity 0.15s; }
.hb-pie-legend { flex: 1; min-width: 0; max-width: 420px; border-collapse: collapse; font-size: 13px; line-height: 18px; font-variant-numeric: tabular-nums; }
.hb-pie-legend tr { cursor: pointer; transition: opacity 0.15s; }
.hb-pie-legend td { padding: 3px 12px 3px 0; vertical-align: top; }
.hb-pie-legend td:last-child { padding-right: 0; }
.hb-pie-swatch { width: 10px; }
.hb-pie-swatch i { display: block; width: 10px; height: 10px; margin-top: 4px; border-radius: 3px; }
.hb-pie-name { width: 100%; color: var(--hb-ink-2); overflow-wrap: anywhere; }
.hb-pie-value { text-align: right; font-weight: 600; white-space: nowrap; }
.hb-pie-share { text-align: right; color: var(--hb-muted); white-space: nowrap; }

/* Horizontal bars: label | bar | value on each row. */
.hb-hbar-box { position: relative; margin: 10px 0 4px; }
.hb-hbar-grid {
  display: grid;
  grid-template-columns: fit-content(40%) minmax(0, 1fr) max-content;
  gap: 8px 12px;
  align-items: center;
  font-size: 13px;
}
.hb-hbar-label { min-width: 64px; line-height: 17px; color: var(--hb-ink-2); }
.hb-hbar-tracks, .hb-hbar-values { display: flex; flex-direction: column; gap: 4px; }
.hb-hbar-track { position: relative; height: 14px; }
.hb-hbar-zero { position: absolute; top: -4px; bottom: -4px; width: 1px; background: var(--hb-line-strong); }
.hb-hbar-bar { position: absolute; top: 0; bottom: 0; border-radius: 3px; }
.hb-hbar-value { line-height: 14px; text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
.hb-hbar-many .hb-hbar-track { height: 12px; }
.hb-hbar-many .hb-hbar-value { font-size: 12px; line-height: 12px; }
.hb-hbar-up { color: var(--hb-good); }
.hb-hbar-down { color: var(--hb-warn); }
`;var _s=`/* Photos */
.hb-photos { margin: 0; display: flex; flex-direction: column; gap: 8px; }
.hb-photo-strip {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 6px;
  scroll-snap-type: x mandatory;
  scrollbar-width: thin;
}
.hb-photo {
  flex: 0 0 220px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;
  height: auto;
  margin: 0;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--hb-line);
  border-radius: 14px;
  background: var(--hb-card);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: zoom-in;
  scroll-snap-align: start;
}
.hb-photo img { display: block; width: 100%; height: 150px; object-fit: cover; background: var(--hb-well); }
.hb-photo-text { display: flex; flex-direction: column; gap: 2px; padding: 8px 10px 10px; }
.hb-photo-caption {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 13px;
  line-height: 17px;
  font-weight: 600;
}
.hb-photo-source { font-size: 11.5px; color: var(--hb-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hb-photo-overlay {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 32px;
  background: rgba(0, 0, 0, 0.82);
  cursor: zoom-out;
  animation: hb-appear 0.18s ease-out;
}
.hb-photo-overlay img { margin: 0; max-width: 100%; max-height: calc(100% - 48px); border-radius: 10px; object-fit: contain; }
.hb-photo-overlay-text { max-width: 720px; text-align: center; font-size: 14px; color: rgba(255, 255, 255, 0.92); }
.hb-photo-overlay-text span { color: rgba(255, 255, 255, 0.6); }
`;var Hs=`/* Tables */
/* A table keeps its natural width (columns close together); the card hugs it. It scrolls inside the card: sideways
   when wider than the chat, down past 520px with the header kept in view. */
.hb-table-card { width: fit-content; max-width: 100%; padding: 4px 0 0; overflow: hidden; }
.hb-table-caption { padding: 10px 16px 2px; }
.hb-table-scroll { max-height: 520px; overflow: auto; overscroll-behavior: contain; }
.hb-table {
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13.5px;
  line-height: 20px;
  font-variant-numeric: tabular-nums;
}
/* With 3 or more columns, a narrow chat scrolls the table rather than squeezing every column. */
.hb-table-wide { min-width: 420px; }
.hb-table th, .hb-table td {
  height: 36px;
  padding: 8px 12px;
  border: 0;
  border-bottom: 1px solid var(--hb-line);
  background: none;
  text-align: left;
  vertical-align: middle;
  white-space: nowrap;
}
/* The header stays in view as the rows scroll; it is painted like the card so rows don't show through. */
.hb-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  height: 34px;
  padding: 0;
  border-bottom-color: var(--hb-line-strong);
  background: linear-gradient(var(--hb-card), var(--hb-card)), var(--hb-surface);
}
.hb-table th button {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  height: 34px;
  padding: 0 12px;
  border: 0;
  background: none;
  color: var(--hb-muted);
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
  cursor: pointer;
}
.hb-table th.hb-num button { justify-content: flex-end; }
.hb-table .hb-first, .hb-table th.hb-first button { padding-left: 16px; }
.hb-table td:last-child, .hb-table th:last-child button { padding-right: 16px; }
.hb-table tbody tr:last-child td { border-bottom: 0; }
.hb-table td.hb-first { font-weight: 600; }
.hb-table td.hb-num { text-align: right; }
.hb-table td.hb-wrap { min-width: 180px; white-space: normal; }
/* Sorting: a faint ↕ on the header under the pointer, ↑ or ↓ on the sorted one. */
.hb-sort { opacity: 0; font-weight: 400; letter-spacing: 0; transition: opacity 0.12s; }
.hb-table th:hover .hb-sort, .hb-table th button:focus-visible .hb-sort { opacity: 0.6; }
.hb-table th.hb-sorted .hb-sort { opacity: 1; color: var(--hb-ink-2); }
/* The best row: an accent edge on its first cell and a chip; the best column: an accent line under its header. */
.hb-table tr.hb-best td.hb-first { box-shadow: inset 3px 0 0 var(--hb-accent); }
.hb-table th.hb-best-col { box-shadow: inset 0 -2px 0 var(--hb-accent); }
.hb-table .hb-chip { margin-left: 8px; vertical-align: 1px; padding: 0 7px; font-size: 11px; line-height: 16px; letter-spacing: 0; text-transform: none; }
.hb-table th .hb-chip { margin-left: 4px; }
/* Changes: green for a rise, orange for a fall, with a small bar growing from the middle. */
.hb-table td.hb-up { color: var(--hb-good); }
.hb-table td.hb-down { color: var(--hb-warn); }
.hb-mini { display: inline-block; position: relative; width: 56px; height: 8px; margin-right: 8px; vertical-align: 0; }
.hb-mini-zero { position: absolute; top: -3px; bottom: -3px; left: 50%; width: 1px; background: var(--hb-line-strong); }
.hb-mini-bar { position: absolute; top: 0; bottom: 0; border-radius: 2px; background: currentColor; }
.hb-table td.hb-table-empty { color: var(--hb-muted); font-weight: 400; text-align: center; }
@media (prefers-reduced-motion: reduce) { .hb-sort { transition: none; } }
.hb-section .hb-table-card { background: none; border: 0; }
`;var Ws=`/* List */
.hb-list { padding: 4px 0; overflow: hidden; }
.hb-list-heading { padding: 8px 16px 2px; font-size: 13px; font-weight: 700; color: var(--hb-muted); }
.hb-list-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-top: 1px solid var(--hb-line);
  color: inherit;
  text-decoration: none;
}
.hb-list > .hb-list-row:first-child, .hb-list-heading + .hb-list-row { border-top: 0; }
.hb-list-link { cursor: pointer; transition: background 0.15s; }
.hb-list-link:hover { background: var(--hb-well); }
.hb-list-rank {
  flex: none;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: var(--hb-accent-soft);
  color: var(--hb-accent-ink);
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.hb-list-photo { flex: none; width: 44px; height: 44px; border-radius: 12px; object-fit: cover; background: var(--hb-well); }
.hb-list-icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: var(--hb-accent-soft);
  color: var(--hb-accent-ink);
}
.hb-list-initial {
  flex: none;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
}
.hb-list-body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.hb-list-title { font-size: 14.5px; line-height: 20px; font-weight: 600; overflow-wrap: anywhere; }
.hb-list-subtitle {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-top: 1px;
  font-size: 13px;
  line-height: 18px;
  color: var(--hb-muted);
}
.hb-list-value { flex: none; font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
.hb-list-chevron { flex: none; color: var(--hb-muted); }
.hb-section .hb-list { padding: 0; }

/* List rows that send a message when tapped */
.hb-list-button {
  width: 100%;
  margin: 0;
  border: 0;
  border-top: 1px solid var(--hb-line);
  background: none;
  font: inherit;
  text-align: left;
}
.hb-list-button:focus-visible { outline: 2px solid var(--hb-accent); outline-offset: -2px; }
`;var Ks=`/* Heatmap */
.hb-heatmap { display: flex; flex-direction: column; gap: 8px; }
.hb-heat-grid { display: grid; gap: 4px; align-items: center; }
.hb-heat-col {
  overflow: hidden;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  font-weight: 600;
  color: var(--hb-muted);
}
.hb-heat-row {
  max-width: 96px;
  padding-right: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 600;
}
.hb-heat-cell {
  display: grid;
  place-items: center;
  min-width: 0;
  height: 32px;
  margin: 0;
  padding: 0 2px;
  overflow: hidden;
  border: 0;
  border-radius: 8px;
  color: var(--hb-ink);
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}
.hb-heat-cell:focus-visible { outline: 2px solid var(--hb-accent); outline-offset: 1px; }
.hb-heat-picked { font-size: 12.5px; color: var(--hb-muted); font-variant-numeric: tabular-nums; }
.hb-heat-picked b { font-weight: 600; color: var(--hb-ink); }
`;var Vs=`/* Flash cards: a grid of cards, each turning over in 3D on a tap to a softly tinted answer. A card grows with its
   text: both faces sit in one grid cell, so the longer side sets its height, and the cards in a row share the row's. */
.hb-flip { display: flex; flex-direction: column; gap: 8px; }
/* At most --hb-flip-cols columns (set from the card count so the last row isn't a lone card), at least 200px each. */
.hb-flip-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(max(200px, calc((100% - (var(--hb-flip-cols, 4) - 1) * 10px) / var(--hb-flip-cols, 4))), 1fr));
  gap: 10px;
}
.hb-flip-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  perspective: 1000px;
}
.hb-flip-inner {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-height: 150px;
  transform-style: preserve-3d;
  transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
}
/* A photo on any card makes every card at least as tall as a photo card needs, so the rows stay even. */
.hb-flip-tall .hb-flip-inner { min-height: 220px; }
.hb-flip-turned { transform: rotateY(180deg); }
.hb-flip-face {
  grid-area: 1 / 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow: hidden;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--hb-line);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
.hb-flip-front { background: var(--hb-card); }
.hb-flip-card:hover .hb-flip-front { border-color: var(--hb-line-strong); }
/* The answer side: a soft wash of the accent over the page colour, text in the normal ink. */
.hb-flip-back {
  transform: rotateY(180deg);
  background: linear-gradient(var(--hb-accent-soft), var(--hb-accent-soft)), var(--hb-surface);
  border-color: color-mix(in srgb, var(--hb-accent) 30%, transparent);
}
.hb-flip-card:focus-visible .hb-flip-face { outline: 2px solid var(--hb-accent); outline-offset: 2px; }
.hb-flip-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--hb-muted);
  font-variant-numeric: tabular-nums;
}
.hb-flip-back .hb-flip-label { color: var(--hb-accent-ink); }
.hb-flip-question, .hb-flip-answer { flex: 1; display: flex; align-items: center; min-height: 0; }
.hb-flip-question { font-size: 14.5px; line-height: 1.35; font-weight: 600; }
.hb-flip-answer { font-size: 13.5px; line-height: 1.45; }
.hb-flip-foot { display: flex; justify-content: space-between; font-size: 11.5px; color: var(--hb-muted); }
.hb-flip-back img { display: block; flex: none; width: calc(100% + 28px); height: 96px; margin: -12px -14px 4px; object-fit: cover; }
@media (prefers-reduced-motion: reduce) {
  .hb-flip-inner, .hb-flip-turned { transition: none; transform: none; }
  .hb-flip-face, .hb-flip-back { transform: none; backface-visibility: visible; -webkit-backface-visibility: visible; transition: opacity 0.2s; }
  .hb-flip-inner:not(.hb-flip-turned) .hb-flip-back, .hb-flip-turned .hb-flip-front { opacity: 0; }
}
`;var Gs=`/* Flow: boxes joined by arrows, left to right (.hb-flow-right) or top to bottom (.hb-flow-down). A group is a dashed
   frame with its label (and count) on top; the lit box (from a steps block) gets the accent outline; boxes a walk
   hasn't reached are dimmed; a box's chips fade in when they change; a tapped box's note opens in a panel under the
   diagram. */
.hb-flow { display: flex; flex-direction: column; gap: 10px; }
.hb-flow-box { position: relative; width: 100%; min-width: 0; }
.hb-flow-chain { display: flex; margin: 0; padding: 0; list-style: none; }
.hb-flow-step { display: flex; align-items: center; min-width: 0; }
.hb-flow-right { flex-direction: row; align-items: stretch; }
.hb-flow-right .hb-flow-chain { flex-direction: row; }
.hb-flow-right .hb-flow-step { flex: 1 1 0; align-items: stretch; }
.hb-flow-right .hb-flow-arrow { align-self: center; }
.hb-flow-down, .hb-flow-down .hb-flow-chain { flex-direction: column; align-items: stretch; }
.hb-flow-down .hb-flow-step { flex-direction: column; align-items: stretch; }
.hb-flow-arrow { display: grid; place-items: center; flex: none; width: 24px; color: var(--hb-muted); }
.hb-flow-down .hb-flow-arrow { width: auto; height: 22px; }
.hb-flow-down .hb-flow-arrow svg { transform: rotate(90deg); }
.hb-flow-node {
  position: relative;
  display: flex;
  flex: 1;
  align-items: center;
  gap: 6px;
  min-width: 0;
  min-height: 44px;
  margin: 0;
  padding: 8px 10px;
  border: 1px solid var(--hb-line-strong);
  border-radius: 10px;
  background: var(--hb-surface);
  color: inherit;
  font: inherit;
  font-size: 13px;
  line-height: 1.3;
  font-weight: 600;
  text-align: left;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
}
.hb-flow-right .hb-flow-node { flex-direction: column; justify-content: center; text-align: center; }
button.hb-flow-node { cursor: pointer; }
button.hb-flow-node:hover { border-color: var(--hb-accent); }
button.hb-flow-node:focus-visible { outline: 2px solid var(--hb-accent); outline-offset: 2px; }
.hb-flow-open { background: var(--hb-accent-soft); border-color: color-mix(in srgb, var(--hb-accent) 45%, transparent); }
.hb-flow-lit { border-color: var(--hb-accent); box-shadow: 0 0 0 2px var(--hb-accent); }
.hb-flow-icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: var(--hb-accent-soft);
  color: var(--hb-accent-ink);
}
.hb-flow-label { min-width: 0; }
.hb-flow-more { margin-left: auto; color: var(--hb-muted); font-weight: 400; }
.hb-flow-right .hb-flow-more { position: absolute; top: 2px; right: 6px; font-size: 12px; }
.hb-flow-group {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  padding: 6px;
  border: 1px dashed var(--hb-line-strong);
  border-radius: 12px;
  background: var(--hb-card);
}
.hb-flow-group-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 6px; }
.hb-flow-down .hb-flow-group-head { justify-content: flex-start; }
.hb-flow-group-label { font-size: 11.5px; font-weight: 600; color: var(--hb-muted); text-align: center; }
.hb-flow-down .hb-flow-group-label { text-align: left; }
.hb-flow-down .hb-flow-node { flex-wrap: wrap; }
.hb-flow-holds { display: flex; flex-wrap: wrap; gap: 3px; animation: hb-flow-fade 0.2s ease-out; }
.hb-flow-right .hb-flow-holds { justify-content: center; }
.hb-flow-down .hb-flow-holds { flex-basis: 100%; }
@keyframes hb-flow-fade { from { opacity: 0; } }
.hb-flow-chip {
  padding: 1px 6px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: var(--hb-well);
  color: var(--hb-ink-2);
  font: 11.5px/16px ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 400;
  white-space: nowrap;
}
.hb-flow-chip-accent { background: var(--hb-accent-soft); color: var(--hb-accent-ink); font-weight: 700; }
/* A box the pass hasn't reached yet: faint, its chips only outlined. */
.hb-flow-idle { color: var(--hb-muted); }
.hb-flow-idle .hb-flow-holds { opacity: 0.6; }
.hb-flow-idle .hb-flow-chip { border-style: dashed; border-color: var(--hb-line-strong); background: none; color: var(--hb-muted); font-family: inherit; }
.hb-flow-packet {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 3;
  width: 12px;
  height: 12px;
  margin: -6px 0 0 -6px;
  border-radius: 999px;
  background: var(--hb-accent);
  box-shadow: 0 0 0 4px var(--hb-accent-soft), 0 0 14px var(--hb-accent);
  opacity: 0;
  pointer-events: none;
}
.hb-flow-right .hb-flow-group > .hb-flow-chain { flex: 1; }
.hb-flow-panel {
  padding: 10px 12px;
  border-radius: 10px;
  background: linear-gradient(var(--hb-accent-soft), var(--hb-accent-soft)), var(--hb-surface);
  border: 1px solid color-mix(in srgb, var(--hb-accent) 30%, transparent);
}
.hb-flow-panel-title { font-size: 13px; font-weight: 700; color: var(--hb-accent-ink); }
.hb-flow-note { margin: 2px 0 0; font-size: 13.5px; line-height: 1.5; }
@media (prefers-reduced-motion: reduce) {
  .hb-flow-node { transition: none; }
  .hb-flow-holds { animation: none; }
}
`;var Xs=`/* Steps: one step at a time; its place top right, the step's title and text, an optional photo, then a row of dots
   and Back / Next. */
.hb-steps { display: flex; flex-direction: column; gap: 10px; }
.hb-steps-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.hb-steps-place {
  margin-left: auto;
  font-size: 12px;
  font-weight: 600;
  color: var(--hb-muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.hb-steps-body { display: flex; flex-direction: column; gap: 4px; min-height: 64px; }
.hb-steps-title { font-size: 15px; line-height: 21px; font-weight: 650; }
.hb-steps-text { margin: 0; font-size: 14px; line-height: 1.5; color: var(--hb-ink-2); }
.hb-steps-photo { display: block; width: 100%; max-height: 220px; margin-top: 6px; border-radius: 10px; object-fit: cover; }
.hb-steps-foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
.hb-steps-dots { display: flex; flex-wrap: wrap; gap: 2px; }
/* Each dot is a 24px target with a small mark inside. */
.hb-steps-dot {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}
.hb-steps-dot::after {
  content: "";
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--hb-line-strong);
  transition: background 0.15s, width 0.15s;
}
.hb-steps-dot-on::after { width: 18px; background: var(--hb-accent); }
.hb-steps-dot:focus-visible { outline: 2px solid var(--hb-accent); outline-offset: -2px; border-radius: 999px; }
.hb-steps-moves { display: flex; gap: 6px; margin-left: auto; }
@media (prefers-reduced-motion: reduce) {
  .hb-steps-dot::after { transition: none; }
}
`;var Us=`/* Layers: the stack on a canvas beside the slab's note, Back / Next and the slab list (side by side when there is
   room, else the list under the drawing). The note and Back / Next use the steps block's classes. */
.hb-layers { display: flex; flex-direction: column; gap: 10px; container-type: inline-size; }
.hb-layers-body { display: grid; gap: 14px; }
@container (min-width: 640px) { .hb-layers-body { grid-template-columns: minmax(0, 1fr) 230px; align-items: start; } }
.hb-layers-stage { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.hb-layers-canvas {
  display: block;
  width: 100%;
  height: clamp(280px, 52cqi, 440px);
  border: 1px solid var(--hb-line);
  border-radius: 12px;
  background: var(--hb-surface);
  cursor: grab;
  touch-action: pan-y;
}
.hb-layers-canvas:active { cursor: grabbing; }
.hb-layers-canvas:focus-visible { outline: 2px solid var(--hb-accent); outline-offset: 2px; }
.hb-layers-hint, .hb-layers-caption { margin: 0; font-size: 12px; color: var(--hb-muted); }
.hb-layers-caption { font-size: 12.5px; color: var(--hb-ink-2); }
.hb-layers-side { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
/* Top slab first, as in the drawing. */
.hb-layers-list { display: flex; flex-direction: column-reverse; gap: 4px; margin: 0; padding: 0; list-style: none; }
.hb-layers-slab {
  width: 100%;
  min-height: 32px;
  padding: 5px 10px;
  border: 1px solid var(--hb-line-strong);
  border-radius: 8px;
  background: var(--hb-surface);
  color: var(--hb-ink-2);
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}
.hb-layers-slab[aria-pressed="true"] { border-color: var(--hb-accent); background: var(--hb-accent-soft); color: var(--hb-accent-ink); font-weight: 650; }
.hb-layers-slab:focus-visible { outline: 2px solid var(--hb-accent); outline-offset: 2px; }
`;var js=`/* Progress: a track toward a goal, with checkpoints */
.hb-progress {
  background: color-mix(in srgb, var(--hb-good) 9%, transparent);
  border-color: color-mix(in srgb, var(--hb-good) 22%, transparent);
}
.hb-progress-head { display: flex; align-items: center; gap: 8px; }
.hb-progress-head .hb-card-title { min-width: 0; }
.hb-progress-icon { display: flex; color: var(--hb-good); }
.hb-progress-amount {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  font-size: 14px;
  font-weight: 600;
  color: var(--hb-ink-2);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.hb-progress-amount svg { color: var(--hb-good); }
.hb-progress-track {
  display: block;
  height: 8px;
  margin: 16px 0 4px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--hb-good) 20%, transparent);
}
.hb-progress-fill { transform-origin: left; animation: hb-grow 0.9s cubic-bezier(0.2, 0.8, 0.2, 1); }
.hb-progress-fill { display: block; height: 100%; border-radius: 999px; background: var(--hb-good); }
.hb-progress-nodes { position: relative; height: 24px; margin-top: 16px; }
.hb-progress-track-steps { position: absolute; top: 8px; margin: 0; }
.hb-progress-fill-steps { position: absolute; top: 8px; height: 8px; }
.hb-progress-node {
  position: absolute;
  top: 0;
  display: grid;
  place-items: center;
  width: 32px;
  height: 24px;
  margin-left: -16px;
  border: 2px solid color-mix(in srgb, var(--hb-good) 35%, var(--hb-surface));
  border-radius: 999px;
  background: var(--hb-surface);
  color: color-mix(in srgb, var(--hb-good) 75%, var(--hb-surface));
}
.hb-progress-node-done { border-color: var(--hb-good); background: var(--hb-good); color: #fff; }
.hb-progress-labels { display: grid; margin-top: 8px; }
.hb-progress-labels span {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  padding: 0 2px;
  text-align: center;
  font-size: 11.5px;
  line-height: 14px;
  font-weight: 500;
  color: var(--hb-muted);
  overflow-wrap: anywhere;
}
@media (prefers-reduced-motion: reduce) {
  .hb-progress-fill { animation: none; }
}
`;var Ys=`/* Streak */
.hb-streak { padding: 0; overflow: hidden; }
.hb-streak-head { display: flex; align-items: center; gap: 12px; padding: 14px 16px 12px; }
.hb-streak-label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--hb-accent-ink);
}
.hb-streak-count {
  font-size: 32px;
  line-height: 38px;
  font-weight: 800;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}
.hb-streak-count span { text-transform: capitalize; }
.hb-streak-medal {
  flex: none;
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  margin-left: auto;
  border-radius: 999px;
  color: #fff;
  background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--hb-chart-2) 45%, #fff), var(--hb-chart-2) 55%,
    color-mix(in srgb, var(--hb-chart-2) 75%, #000));
  box-shadow: 0 8px 20px -8px color-mix(in srgb, var(--hb-chart-2) 70%, transparent);
}
.hb-streak-week { display: grid; padding: 12px 8px; border-top: 1px solid var(--hb-line); }
.hb-streak-day { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.hb-streak-day-label { font-size: 12.5px; color: var(--hb-muted); }
.hb-streak-done {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: var(--hb-accent-soft);
  color: var(--hb-accent-ink);
}
.hb-streak-date {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  font-size: 16px;
  color: var(--hb-muted);
  font-variant-numeric: tabular-nums;
}
.hb-streak-dot { width: 4px; height: 4px; border-radius: 999px; }
.hb-streak-today .hb-streak-day-label, .hb-streak-today .hb-streak-date { font-weight: 700; color: var(--hb-ink); }
.hb-streak-today .hb-streak-dot { background: var(--hb-ink-2); }
`;var qs=`/* A row of pill buttons (the pills themselves are in styles/shared.css). */
.hb-actions { display: flex; flex-wrap: wrap; gap: 8px; }
`;var Zs=`/* Tiles: cover cards. Every card keeps the cover shape — its height comes from its aspect-ratio, never from the
   text, so rows stay even however long a reason is. The reason reads in up to three lines (the reader cuts it to
   about 120 characters between words), in full white with a shadow, and the photo stays bright: only the caption
   block darkens behind the text, there is no overlay over the whole card. */
.hb-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.hb-tile {
  position: relative;
  display: block;
  aspect-ratio: 1 / 1.05;
  margin: 0;
  padding: 0;
  overflow: hidden;
  border: 0;
  border-radius: 20px;
  color: #fff;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.hb-tile:hover { transform: translateY(-1px); }
.hb-tile:active { transform: scale(0.98); }
.hb-tile:disabled { cursor: default; transform: none; }
.hb-tile-static { cursor: default; }
.hb-tile-static:hover,
.hb-tile-static:active { transform: none; }
.hb-tile:focus-visible { outline: 2px solid var(--hb-accent); outline-offset: 2px; }
.hb-tile img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.hb-tile-icon {
  position: absolute;
  top: 12px;
  left: 12px;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(8px);
}
/* The scrim is localized: it is the caption block's own background, so it fades in over the text and nowhere
   else — the photo above the caption keeps its full brightness. It is already dark by the title (the top third of
   the fade does most of the work), so a title over snow or sky reads as well as the lines under it. */
.hb-tile-text {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 30px 12px 12px 14px;
  background: linear-gradient(180deg, rgba(12, 8, 24, 0) 0%, rgba(12, 8, 24, 0.46) 34%, rgba(12, 8, 24, 0.72) 100%);
}
.hb-tile-title { font-size: 15.5px; line-height: 20px; font-weight: 700; letter-spacing: -0.01em; text-shadow: 0 1px 8px rgba(0, 0, 0, 0.3); }
.hb-tile-subtitle {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 12.5px;
  line-height: 16px;
  color: #fff;
  text-shadow: 0 1px 2px rgba(12, 8, 24, 0.55);
}
@media (prefers-reduced-motion: reduce) {
  .hb-tile { transition: none; }
}
`;var Js=`/* Checklist */
.hb-checklist { display: flex; flex-direction: column; }
.hb-checklist-head { display: flex; align-items: baseline; gap: 8px; }
.hb-checklist-head .hb-card-title { flex: 1; min-width: 0; }
.hb-checklist-count {
  margin-left: auto;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--hb-muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.hb-checklist-count-done { color: var(--hb-good); }
.hb-checklist-track { display: block; height: 6px; margin: 8px 0 4px; overflow: hidden; border-radius: 999px; background: var(--hb-well); }
.hb-checklist-fill { display: block; height: 100%; border-radius: 999px; background: var(--hb-good); transition: width 0.3s ease; }
.hb-checklist-group { padding: 10px 0 2px; font-size: 12px; font-weight: 700; color: var(--hb-muted); }
.hb-check {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  margin: 0;
  padding: 7px 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.hb-check:focus-visible { outline: 2px solid var(--hb-accent); outline-offset: 2px; border-radius: 8px; }
.hb-check-mark {
  flex: none;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  margin-top: 0.5px;
  border: 2px solid var(--hb-line-strong);
  border-radius: 999px;
  color: var(--hb-muted);
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  transition: background 0.15s, border-color 0.15s;
}
.hb-check-on .hb-check-mark { border-color: var(--hb-good); background: var(--hb-good); color: #fff; }
.hb-check-text { flex: 1; min-width: 0; font-size: 14.5px; line-height: 21px; transition: color 0.15s; }
.hb-check-on .hb-check-text { color: var(--hb-muted); text-decoration: line-through; text-decoration-thickness: 1px; }
@media (prefers-reduced-motion: reduce) {
  .hb-checklist-fill, .hb-check-mark, .hb-check-text { transition: none; }
}
`;var Qs=`/* Calculator; a form's slider uses the same .hb-calc-head, .hb-calc-label, .hb-calc-value and .hb-range. */
.hb-calc { display: flex; flex-direction: column; }
/* At the top of a reply sliders stop at 720px rather than stretching across a wide board; in a layout block they fill
   their place. */
.hb-blocks > .hb-calc { max-width: 720px; }
.hb-calc-slider { display: block; padding: 8px 0; }
.hb-calc-head { display: flex; align-items: baseline; gap: 8px; }
.hb-calc-label { flex: 1; min-width: 0; font-size: 13.5px; font-weight: 600; color: var(--hb-ink-2); }
.hb-calc-value { font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
.hb-range { display: block; width: 100%; margin: 8px 0 0; accent-color: var(--hb-accent); cursor: pointer; }
.hb-calc-ends { display: flex; justify-content: space-between; font-size: 11px; color: var(--hb-muted); font-variant-numeric: tabular-nums; }
.hb-calc-results { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; margin-top: 8px; }
/* A calculator's live chart sits in the calculator's card, so it drops its own card look. */
.hb-calc > .hb-chart { margin-top: 10px; padding: 10px 0 0; border: 0; border-top: 1px solid var(--hb-line); border-radius: 0; background: none; }
.hb-calc-result { min-width: 0; padding: 10px 14px; border-radius: 14px; background: var(--hb-accent-soft); }
.hb-calc-result-label { font-size: 12px; font-weight: 600; color: var(--hb-accent-ink); }
.hb-calc-result-value {
  margin-top: 2px;
  font-size: 20px;
  line-height: 1.2;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
`;var el=`/* Simulation: a title with the view switch, then Play, the time scrubber and the sliders, then the piles of dots or
   the line chart. The sliders use the calculator's .hb-calc-slider and .hb-range; the legend the chart's. */
.hb-sim { display: flex; flex-direction: column; gap: 12px; container-type: inline-size; }
.hb-blocks > .hb-sim { max-width: 720px; }
.hb-sim-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 12px; }
.hb-sim-switch { display: inline-flex; gap: 2px; padding: 3px; border-radius: 999px; background: var(--hb-well); }
.hb-sim-switch button {
  min-height: 30px;
  padding: 5px 12px;
  border: 0;
  border-radius: 999px;
  background: none;
  color: var(--hb-ink-2);
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}
.hb-sim-switch button[aria-pressed="true"] { background: var(--hb-surface); color: var(--hb-ink); box-shadow: 0 1px 2px var(--hb-line-strong); }
.hb-sim-switch button:focus-visible { outline: 2px solid var(--hb-accent); outline-offset: 1px; }
.hb-sim-controls { display: grid; grid-template-columns: 1fr; gap: 0 18px; align-items: center; }
@container (min-width: 560px) { .hb-sim-controls { grid-template-columns: auto 1fr 1fr; } }
.hb-sim-play { justify-self: start; }
.hb-sim-piles { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
.hb-sim-pile { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.hb-sim-pile-name { font-size: 12.5px; font-weight: 600; color: var(--hb-ink-2); }
.hb-sim-amount { font-size: 20px; font-weight: 700; letter-spacing: -0.01em; font-variant-numeric: tabular-nums; }
.hb-sim-canvas { display: block; width: 100%; border-bottom: 1px solid var(--hb-line-strong); }
.hb-sim-chart { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.hb-sim-chart svg { display: block; overflow: visible; }
.hb-sim-chart text { font-size: 11px; fill: var(--hb-muted); font-variant-numeric: tabular-nums; }
.hb-sim-grid { stroke: var(--hb-line); }
.hb-sim-line { fill: none; stroke: currentColor; stroke-width: 2.5; stroke-linejoin: round; stroke-linecap: round; }
.hb-sim-point { fill: currentColor; stroke: var(--hb-surface); stroke-width: 2; }
`;var tl=`/* Form: at most 720px wide at the top of a reply (like a calculator), filling its place in a layout block. */
.hb-blocks > .hb-form { max-width: 720px; }
.hb-form-field { display: block; padding: 8px 0; }
.hb-form fieldset { min-width: 0; margin: 0; padding: 0; border: 0; }
.hb-form-sent fieldset { opacity: 0.6; }
.hb-form-label { display: block; margin-bottom: 6px; font-size: 13.5px; font-weight: 600; color: var(--hb-ink-2); }
.hb-input {
  display: block;
  width: 100%;
  min-width: 0;
  height: 38px;
  padding: 0 12px;
  border: 1px solid var(--hb-line-strong);
  border-radius: 12px;
  background: var(--hb-surface);
  color: var(--hb-ink);
  font: inherit;
  font-size: 14px;
  color-scheme: light dark;
}
textarea.hb-input { height: auto; padding: 8px 12px; line-height: 20px; resize: vertical; }
.hb-input:focus { outline: 2px solid var(--hb-accent); outline-offset: -1px; }
.hb-input::placeholder { color: var(--hb-muted); }
.hb-options { display: flex; flex-wrap: wrap; gap: 8px; }
.hb-option {
  min-height: 34px;
  max-width: 100%;
  margin: 0;
  padding: 6px 14px;
  border: 1px solid var(--hb-line-strong);
  border-radius: 999px;
  background: none;
  color: var(--hb-ink);
  font: inherit;
  font-size: 13.5px;
  line-height: 18px;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.hb-option:hover { background: var(--hb-well); }
.hb-option-on, .hb-option-on:hover { border-color: var(--hb-accent); background: var(--hb-accent-soft); color: var(--hb-accent-ink); font-weight: 600; }
.hb-option:focus-visible { outline: 2px solid var(--hb-accent); outline-offset: 2px; }
.hb-option:disabled { cursor: default; }
.hb-form-foot { display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin-top: 8px; }
.hb-form-done { flex: 1; font-size: 12.5px; font-weight: 600; color: var(--hb-good); }
/* Form extras: group headings, option notes, a select's note and a slider's end words */
.hb-form-group { padding: 12px 0 0; font-size: 12px; font-weight: 700; color: var(--hb-muted); }
.hb-option-note { display: block; font-size: 11.5px; line-height: 15px; font-weight: 400; color: var(--hb-muted); }
.hb-option-on .hb-option-note { color: var(--hb-accent-ink); }
.hb-form-note { display: block; margin-top: 4px; font-size: 12px; line-height: 16px; color: var(--hb-muted); }
.hb-form-ends { display: flex; justify-content: space-between; gap: 8px; margin-top: 2px; font-size: 11px; color: var(--hb-muted); }
@media (prefers-reduced-motion: reduce) {
  .hb-option { transition: none; }
}
`;var nl=`/* briefing: Today's sky band. Fixed sky gradients with white text (every stop at least 4.5:1, a test checks); the counts
   sit on soft tinted chips, not loud badges. */
.hb-brief { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 8px; padding: 14px 18px;
  border-radius: 18px; color: #fff; background: linear-gradient(160deg, #1d4fa3, #3a6cc0); }
.hb-brief::after { content: ""; position: absolute; inset: 0; pointer-events: none; opacity: .5; }
.hb-brief > * { position: relative; z-index: 1; }
.hb-brief-clear { background: linear-gradient(160deg, #1d4fa3 0%, #2c62bd 60%, #3a6cc0 100%); }
.hb-brief-cloud { background: linear-gradient(160deg, #3f4c63 0%, #55637c 60%, #66748c 100%); }
.hb-brief-rain { background: linear-gradient(160deg, #34435b 0%, #4d5e78 55%, #5f708a 100%); }
.hb-brief-rain::after { background: repeating-linear-gradient(105deg, transparent 0 13px, rgba(255, 255, 255, .08) 13px 14px); }
.hb-brief-snow { background: linear-gradient(160deg, #4a5d7c 0%, #5a6d8c 60%, #627592 100%); }
.hb-brief-storm { background: linear-gradient(160deg, #262f45 0%, #44506b 60%, #5a6680 100%); }
.hb-brief-fog { background: linear-gradient(160deg, #525a68 0%, #646d7b 60%, #6b7482 100%); }
.hb-brief-night { background: linear-gradient(160deg, #141b38 0%, #2a3566 60%, #45508a 100%); }
.hb-brief-top { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 6px 16px; }
.hb-brief-hello { display: flex; flex-direction: column; min-width: 0; }
.hb-brief-date { font-size: 12px; opacity: .85; }
.hb-brief h2 { margin: 2px 0 0; font-size: 19px; line-height: 1.2; font-weight: 700; letter-spacing: -0.01em; color: #fff; }
.hb-brief-wx { display: flex; flex-direction: column; align-items: flex-end; text-align: right; }
.hb-brief-temp { font-size: 26px; line-height: 1; font-weight: 700; font-variant-numeric: tabular-nums; }
.hb-brief-sky { margin-top: 2px; font-size: 12px; opacity: .9; }
.hb-brief-line { margin: 0; font-size: 15px; line-height: 1.4; font-weight: 600; }
.hb-brief-bad, .hb-brief-good { padding: 1px 6px; border-radius: 6px; }
.hb-brief-bad { background: rgba(255, 110, 110, .3); }
.hb-brief-good { background: rgba(110, 230, 160, .26); }
`;var rl=`/* tracker: Needs you | Handled. Small and quiet: an 11px state pill, 18px count badges, a 3px coloured edge by
   state, outline help buttons, one solid pay link. */
.hb-tr { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.hb-tr-switch { align-self: flex-start; display: inline-flex; gap: 2px; padding: 3px; border-radius: 999px; background: var(--hb-well); }
.hb-tr-switch button { all: unset; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px;
  border-radius: 999px; font-size: 13px; font-weight: 600; color: var(--hb-muted); }
.hb-tr-switch button[aria-selected="true"] { background: var(--hb-surface); color: var(--hb-ink); box-shadow: 0 1px 3px rgba(15, 20, 30, .14); }
.hb-tr-switch button:focus-visible { outline: 2px solid var(--hb-accent); outline-offset: 2px; }
.hb-tr-badge { min-width: 18px; height: 18px; padding: 0 6px; border-radius: 999px; display: inline-grid; place-items: center;
  font-size: 11px; font-weight: 700; font-variant-numeric: tabular-nums; background: var(--hb-line-strong); color: var(--hb-ink); }
.hb-tr-badge-red { background: #d63b2f; color: #fff; }
.hb-tr-badge-green { background: var(--hb-good); color: #fff; }
.hb-tr-pulse { animation: hb-tr-pulse 1.2s ease 1; }
@keyframes hb-tr-pulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--hb-good) 60%, transparent); }
  100% { box-shadow: 0 0 0 8px transparent; } }
.hb-tr-list { display: flex; flex-direction: column; gap: 8px; }
.hb-tr-card, .hb-tr-row { display: flex; flex-direction: column; gap: 6px; min-width: 0; padding: 10px 12px;
  border: 1px solid var(--hb-line); border-left: 3px solid var(--hb-line-strong); border-radius: 12px; background: var(--hb-card); }
.hb-tr-overdue { border-left-color: #d63b2f; }
.hb-tr-today, .hb-tr-soon { border-left-color: #e08a1e; }
.hb-tr-closed { border-left-color: var(--hb-good); background: color-mix(in srgb, var(--hb-good) 7%, var(--hb-card)); }
.hb-tr-protected { border-left-color: #d63b2f; }
.hb-tr-top { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
.hb-tr-title { font-size: 14px; font-weight: 600; line-height: 1.3; min-width: 0; overflow-wrap: anywhere; }
.hb-tr-amount { font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
.hb-tr-pill { align-self: flex-start; display: inline-flex; align-items: center; gap: 5px; padding: 3px 7px; border-radius: 999px;
  font-size: 11px; line-height: 1.2; font-weight: 600; background: var(--hb-well); color: var(--hb-muted); }
.hb-tr-pill::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.hb-tr-pill-overdue { color: #c4321f; background: color-mix(in srgb, #d63b2f 12%, transparent); }
.hb-tr-pill-today, .hb-tr-pill-soon { color: #9a5a00; background: color-mix(in srgb, #e08a1e 14%, transparent); }
.dark .hb-tr-pill-overdue { color: #ff9a8a; }
.dark .hb-tr-pill-today, .dark .hb-tr-pill-soon { color: #ffc46b; }
.hb-tr-acts { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.hb-tr-go, .hb-tr-help { font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 999px; line-height: 1.3; }
.hb-tr-go { background: var(--hb-accent); color: #fff; text-decoration: none; }
.hb-tr-help { all: unset; cursor: pointer; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 999px;
  border: 1px solid var(--hb-accent); color: var(--hb-accent-ink); }
.hb-tr-go:focus-visible, .hb-tr-help:focus-visible, .hb-tr-link:focus-visible { outline: 2px solid var(--hb-accent); outline-offset: 2px; }
.hb-tr-verb { font-size: 11px; font-weight: 700; color: var(--hb-muted); white-space: nowrap; }
.hb-tr-closed .hb-tr-verb { color: var(--hb-good); }
.hb-tr-protected .hb-tr-verb { color: #c4321f; }
.dark .hb-tr-protected .hb-tr-verb { color: #ff9a8a; }
.hb-tr-why { font-size: 12.5px; color: var(--hb-muted); }
.hb-tr-link { all: unset; cursor: pointer; align-self: flex-start; font-size: 12px; color: var(--hb-muted); text-decoration: underline;
  text-underline-offset: 3px; }
.hb-tr-details summary { cursor: pointer; width: max-content; font-size: 12px; color: var(--hb-muted); }
.hb-tr-details dl { display: grid; grid-template-columns: max-content 1fr; gap: 3px 10px; margin: 6px 0 0; padding: 8px 10px;
  border-radius: 8px; background: var(--hb-well); font-size: 12px; }
.hb-tr-details dt { color: var(--hb-muted); }
.hb-tr-details dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
.hb-tr-empty { margin: 0; font-size: 13px; color: var(--hb-muted); }
@media (prefers-reduced-motion: reduce) { .hb-tr-pulse { animation: none; } }
`;var ol=`/* prepared: photo ideas, two by two, captions on a dark scrim; small, quiet buttons. */
.hb-prep { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.hb-prep-label { font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--hb-muted); }
.hb-prep-group { display: flex; flex-direction: column; gap: 8px; padding: 10px 12px; border: 1px solid var(--hb-line);
  border-radius: 12px; background: var(--hb-card); }
.hb-prep-head { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
.hb-prep-title { font-size: 14px; font-weight: 600; }
.hb-prep-date { font-size: 12px; color: var(--hb-muted); white-space: nowrap; }
.hb-prep-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
.hb-prep-idea { all: unset; cursor: pointer; position: relative; overflow: hidden; border-radius: 10px; aspect-ratio: 4 / 3;
  max-width: 100%; background: linear-gradient(140deg, #6b7a99, #a3b0c7); }
.hb-prep-idea img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.hb-prep-idea:focus-visible { outline: 2px solid var(--hb-accent); outline-offset: 2px; }
.hb-prep-cap { position: absolute; inset: auto 0 0 0; padding: 16px 8px 6px; color: #fff; font-size: 12px; font-weight: 600;
  line-height: 1.25; background: linear-gradient(180deg, transparent, rgba(10, 8, 20, .72)); display: flex; flex-direction: column; }
.hb-prep-cap small { font-size: 10.5px; font-weight: 500; opacity: .85; }
.hb-prep-ask { all: unset; cursor: pointer; align-self: flex-start; font-size: 12px; font-weight: 600; padding: 3px 10px;
  border-radius: 999px; border: 1px solid var(--hb-accent); color: var(--hb-accent-ink); }
.hb-prep-ask:focus-visible { outline: 2px solid var(--hb-accent); outline-offset: 2px; }
`;var al=`/* calendar: one flat, wide strip after Odie's Today. Date | next event and the day's events | the week. It stacks on
   a phone. */
.hb-blocks .hb-cal { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 18px;
  padding: 12px 16px; border-radius: 22px;
  background: linear-gradient(110deg, color-mix(in srgb, #8a63d2 12%, var(--hb-card)),
    color-mix(in srgb, #e86aa6 9%, var(--hb-card)) 80%); }
@media (max-width: 760px) { .hb-blocks .hb-cal { grid-template-columns: auto minmax(0, 1fr); }
  .hb-cal-week { grid-column: 1 / -1; } }

.hb-cal-date { display: flex; flex-direction: column; align-items: center; min-width: 76px; padding-right: 16px;
  border-right: 1px solid var(--hb-line); }
.hb-cal-weekday { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--hb-ink-2); }
.hb-cal-day { font-size: 44px; line-height: 1; font-weight: 800; letter-spacing: -0.04em; font-variant-numeric: tabular-nums; }
.hb-cal-month { font-size: 11.5px; color: var(--hb-muted); white-space: nowrap; }

.hb-cal-mid { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.hb-cal-next-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; min-width: 0; }
.hb-cal-title { font-size: 13px; font-weight: 700; color: var(--hb-ink-2); }
.hb-cal-next { display: inline-flex; align-items: baseline; gap: 8px; min-width: 0; }
.hb-cal-next-when { font-size: 12px; font-weight: 700; color: var(--hb-accent); }
.hb-cal-next-time { font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; }
.hb-cal-next-title { font-size: 14px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hb-cal-ask { all: unset; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px;
  border-radius: 99px; background: var(--hb-ink); color: var(--hb-surface, #fff); font-size: 12.5px; font-weight: 600;
  margin-left: auto; }
.hb-cal-ask:focus-visible { outline: 2px solid var(--hb-accent); outline-offset: 2px; }
.hb-cal-events { list-style: none; margin: 0; padding: 0 28px 2px 0; display: flex; gap: 5px; overflow-x: auto;
  scrollbar-width: none; mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent);
  -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent); }
.hb-cal-events li { flex: 0 0 auto; display: inline-flex; align-items: baseline; gap: 4px; padding: 2px 8px;
  border-radius: 99px; background: color-mix(in srgb, var(--hb-surface, #fff) 70%, transparent);
  border: 1px solid var(--hb-line); font-size: 11px; line-height: 1.5; white-space: nowrap; }
.hb-cal-event-time { font-weight: 700; color: var(--hb-ink-2); font-variant-numeric: tabular-nums; }
.hb-cal-event-title { font-weight: 500; }
.hb-cal-empty { font-size: 13px; color: var(--hb-muted); }

.hb-cal-week { list-style: none; margin: 0; padding: 3px; display: grid; grid-template-columns: repeat(7, 30px); gap: 2px;
  border-radius: 16px; background: color-mix(in srgb, var(--hb-surface, #fff) 70%, transparent); border: 1px solid var(--hb-line); }
@media (max-width: 760px) { .hb-cal-week { grid-template-columns: repeat(7, minmax(0, 1fr)); } }
.hb-cal-week li { display: flex; flex-direction: column; align-items: center; gap: 1px; padding: 3px 0; border-radius: 10px;
  font-size: 10px; color: var(--hb-muted); }
.hb-cal-week li b { font-size: 13px; font-weight: 600; color: var(--hb-ink-2); font-variant-numeric: tabular-nums; }
.hb-cal-week li i { width: 4px; height: 4px; border-radius: 50%; }
.hb-cal-week li.has-events i { background: var(--hb-accent); }
.hb-cal-week li.is-selected { background: var(--hb-ink); color: var(--hb-surface, #fff); }
.hb-cal-week li.is-selected b { color: var(--hb-surface, #fff); }
.hb-cal-week li.is-selected.has-events i { background: var(--hb-surface, #fff); }
`;var il=`/* upnext: Odie's Up Next cards. Each card takes its kind's two pastel colours (--ka, --kb from EventArt's kindVars),
   and the deep night pair in dark mode (--kda, --kdb). */
.hb-up { display: flex; flex-direction: column; gap: 10px; container-type: inline-size; }
.hb-up-row { --up-n: 2; }
/* Only whole cards: as many as fit the width (about 160px or more each), never one sliced at the edge. The rest
   scroll in, a card at a time. */
@container (min-width: 520px) { .hb-up-row { --up-n: 3; } }
@container (min-width: 700px) { .hb-up-row { --up-n: 4; } }
@container (min-width: 880px) { .hb-up-row { --up-n: 5; } }
@container (min-width: 1060px) { .hb-up-row { --up-n: 6; } }
.hb-up-heading { font-size: 13px; font-weight: 700; color: var(--hb-ink-2); }
.hb-up-row { display: flex; gap: 12px; overflow-x: auto; scroll-snap-type: x mandatory; padding: 2px 0 8px;
  scrollbar-width: none; }
.hb-up-card { all: unset; box-sizing: border-box; cursor: pointer; scroll-snap-align: start; flex: 0 0 calc((100% - (var(--up-n) - 1) * 12px) / var(--up-n));
  min-width: 0; min-height: 168px; padding: 12px; border-radius: 24px; display: flex; flex-direction: column;
  background: linear-gradient(150deg, var(--ka), var(--kb)); color: #1d1a2c; border: 1px solid rgba(255, 255, 255, .6);
  box-shadow: 0 14px 30px -22px rgba(40, 30, 70, .45); transition: transform .15s ease; }
.dark .hb-up-card { background: linear-gradient(150deg, var(--kda), var(--kdb)); color: #f4f2fb; border-color: rgba(255, 255, 255, .08); }
.hb-up-card:hover { transform: translateY(-2px); }
.hb-up-card:active { transform: scale(.98); }
.hb-up-card:focus-visible { outline: 2px solid var(--hb-accent); outline-offset: 2px; }
.hb-up-top { display: flex; align-items: flex-start; justify-content: space-between; }
.hb-up-top > span { display: flex; flex-direction: column; }
.hb-up-weekday { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; opacity: .75; }
.hb-up-source { display: inline-grid; place-items: center; width: 20px; height: 20px; border-radius: 50%;
  background: rgba(255, 255, 255, .85); color: #4a4560; }
.dark .hb-up-source { background: rgba(255, 255, 255, .14); color: #f4f2fb; }
.hb-up-day { font-size: 32px; line-height: 1; font-weight: 800; letter-spacing: -0.04em; font-variant-numeric: tabular-nums; }
.hb-up-title { margin-top: 10px; font-size: 14.5px; line-height: 1.25; font-weight: 600; display: -webkit-box;
  -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 36px; }
.hb-up-meta { margin-top: auto; padding-top: 6px; font-size: 12.5px; opacity: .7; font-variant-numeric: tabular-nums; }
/* A tracked item's state: a small pill (dot + words) on a translucent ground, so the card's own colours stay. Red only
   for overdue; amber for today and soon. */
.hb-up-state { align-self: flex-start; display: inline-flex; align-items: center; gap: 5px; margin-top: 6px;
  padding: 3px 7px; border-radius: 999px; font-size: 11px; line-height: 1.2; font-weight: 600;
  background: rgba(255, 255, 255, .78); }
.dark .hb-up-state { background: rgba(0, 0, 0, .32); }
.hb-up-state::before { content: ""; flex: none; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.hb-up-state-overdue { color: #c4321f; }
.hb-up-state-today, .hb-up-state-soon { color: #9a5a00; }
.dark .hb-up-state-overdue { color: #ff9a8a; }
.dark .hb-up-state-today, .dark .hb-up-state-soon { color: #ffc46b; }
/* Compact (Today): smaller cards in rows that fit the width, no sideways scroll; at most two rows. */
.hb-up-compact { display: grid; grid-template-columns: repeat(auto-fit, minmax(124px, 1fr)); gap: 8px; overflow: visible;
  padding: 0; grid-auto-rows: auto; }
.hb-up-compact .hb-up-card { min-height: 112px; padding: 10px; border-radius: 16px; }
.hb-up-compact .hb-up-day { font-size: 22px; }
.hb-up-compact .hb-up-title { margin-top: 6px; font-size: 13px; min-height: 0; }
.hb-up-compact .hb-up-meta { font-size: 11.5px; }
.hb-up-compact > :nth-child(n+9) { display: none; }
@container (max-width: 480px) { .hb-up-compact { grid-template-columns: 1fr 1fr; } .hb-up-compact > :nth-child(n+5) { display: none; } }
@media (prefers-reduced-motion: reduce) { .hb-up-card { transition: none; } .hb-up-card:hover { transform: none; } }
`;var sl=`/* weather: one wide strip after Odie's Today. Big temperature | sky in place, high and tonight's low. */
.hb-blocks .hb-weather { display: flex; align-items: center; gap: 22px; padding: 16px 26px; border-radius: 22px;
  background: linear-gradient(105deg, color-mix(in srgb, #7aa7ff 22%, var(--hb-card)),
    color-mix(in srgb, #ffd66b 24%, var(--hb-card)) 100%); }
.hb-weather-temp { font-size: 44px; line-height: 1; font-weight: 800; letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums; }
.hb-weather-text { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.hb-weather-where { font-size: 16px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hb-weather-range { font-size: 13.5px; color: var(--hb-ink-2); }
`;var ll=`/* The Today page: an assembled dashboard. Only its header is the page's own; everything under it is catalog blocks. */
.hb-dash { box-sizing: border-box; height: 100%; overflow-y: auto; padding: 28px clamp(16px, 4vw, 40px) 48px;
  background: var(--hb-surface); color: var(--hb-ink); }
/* The page takes the whole window: no chat-column cap on it or the board inside it. */
.hb-blocks.hb-dash, .hb-dash > .hb-blocks { max-width: none; }
.hb-dash-head { margin-bottom: 18px; }
.hb-dash-date { font-size: 13px; font-weight: 600; color: var(--hb-muted); }
.hb-dash-head h1 { margin: 6px 0 0; font-size: clamp(28px, 4vw, 36px); line-height: 1.12; font-weight: 700;
  letter-spacing: -0.025em; }
.hb-dash-sub { color: var(--hb-muted); }
/* On the Today page, a row of numbers spans the page's width; in chat it keeps its compact 200px cards. */
.hb-dash .hb-kpis { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
/* A lone number (one stock's price) stays a card, not a banner. */
.hb-dash .hb-kpis:has(> :only-child) { grid-template-columns: minmax(150px, 320px); }
/* A designed page's snapshot line under the header: label · updated 09:12 · (why it failed) · ↻ Refresh. */
.hb-refresh { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin: -6px 0 16px; font-size: 13px;
  color: var(--hb-muted); }
.hb-refresh-label { font-weight: 700; color: var(--hb-ink-2); }
.hb-refresh-error { color: var(--hb-warn, #b7791f); }
.hb-refresh-button { all: unset; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; height: 28px;
  padding: 0 12px; border-radius: 99px; border: 1px solid var(--hb-line); color: var(--hb-ink); font-weight: 600; }
.hb-refresh-button:disabled { cursor: default; opacity: .6; }
.hb-refresh-button:focus-visible { outline: 2px solid var(--hb-accent); outline-offset: 2px; }
`;var cl=`/* log's Lynx look over the upstream blocks, loaded last so it wins: the same card, title and number rules as log's
   report kit (src/mcp/apps/report/view/kit.css). Upstream's bold headings and heavy figures become Lynx's light
   ones; colour and type come from tokens.css. */
.hb-card {
  background: var(--hb-card);
  border: 1px solid var(--hb-line);
  border-radius: var(--hb-radius);
  padding: 16px 18px;
  box-shadow: none;
}
.hb-card-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.015em;
}
.hb-kpis { gap: 12px; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
.hb-kpi { padding: 16px 18px; gap: 4px; }
.hb-kpi-label { font-size: 12.5px; font-weight: 500; color: var(--hb-muted); }
.hb-kpi-value {
  font-size: 32px;
  font-weight: 450;
  letter-spacing: -0.035em;
  line-height: 1.15;
}
.hb-kpi-value-text { font-size: 17px; font-weight: 500; letter-spacing: -0.015em; }
.hb-kpi-change { font-weight: 500; }
.hb-chip { font-weight: 500; }
.hb-pill { font-weight: 500; border-radius: 10px; }
.hb-pill-solid { color: var(--hb-surface); }
.hb-pill-solid:hover { background: color-mix(in srgb, var(--hb-accent) 86%, var(--hb-surface)); }
.hb-blocks h1, .hb-blocks h2, .hb-blocks h3 { font-weight: 600; letter-spacing: -0.02em; }
`;var db=[$s,Ls,Es,Fs,Is,zs,Rs,Ps,Os,Ds,_s,Hs,Ws,Ks,Vs,Gs,Xs,Us,js,Ys,qs,Zs,Js,Qs,el,tl,nl,rl,ol,al,il,sl,ll,cl],pl=db.join(`
`);import{jsx as ul}from"react/jsx-runtime";var hb="hermes-genui",dl="hermes-genui-css";function bb(){let e=document.getElementById(dl);if(!e)e=document.createElement("style"),e.id=dl,document.head.appendChild(e);e.textContent=pl}var Lv={id:hb,name:"Hermes GenUI",register(e){bb();let t=(i)=>e.rest(`/blocks/${i}`),n=(i,s)=>e.rest(i,s),r=(i)=>Nn(wr?.composer).send(i),o=(i)=>Nn(wr?.composer).fill(i);e.register({id:"hermes-genui-tag",area:ub,data:{name:"blocks",render:({attrs:i,streaming:s})=>ul(_.Provider,{value:{send:r,fill:o,rest:n,blockId:i?.id},children:ul(xs,{id:i?.id,streaming:Boolean(s),load:t})})}}),Ms(e,(i)=>void As(i,wr??{}))}};export{Lv as default};
