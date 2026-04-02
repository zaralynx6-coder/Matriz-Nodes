import fs from 'node:fs';
import path from 'node:path';

const counts = { Pessoa: 1000, Empresa: 500, Conta: 500, Transacao: 2000, Produto: 500, Fatura: 300, Projeto: 150, Documento: 50 };
const types = Object.keys(counts);
const randInt=(min,max)=>Math.floor(Math.random()*(max-min+1))+min;
const pick=(arr)=>arr[randInt(0,arr.length-1)];
const picks=(arr,count)=>Array.from({length:count},()=>pick(arr));
const departments=['Financeiro','Operações','TI','RH','Comercial'];
const segments=['Varejo','Indústria','Tecnologia','Serviços','Saúde'];
const names=['Ana','Bruno','Carla','Daniel','Eduarda','Felipe','Gabriela','Hugo','Iara','João'];
const surnames=['Silva','Souza','Oliveira','Costa','Lima','Pereira','Rocha'];

const nodes=[]; const edges=[]; const byType={}; types.forEach(t=>byType[t]=[]);
const addNode=(type,index,label,properties)=>{const n={id:`${type.toLowerCase()}_${index}`,type,label,properties};nodes.push(n);byType[type].push(n);};
for(let i=0;i<counts.Pessoa;i++){const fn=`${pick(names)} ${pick(surnames)}`;addNode('Pessoa',i,fn,{documentoAnon:`***${randInt(100,999)}`,papel:pick(['cliente','colaborador']),email:`${fn.toLowerCase().replace(' ','.')}@empresa.com`});}
for(let i=0;i<counts.Empresa;i++) addNode('Empresa',i,`Empresa ${i}`,{segmento:pick(segments),pais:'BR'});
for(let i=0;i<counts.Conta;i++) addNode('Conta',i,`Conta ${i}`,{instituicao:`Banco ${randInt(1,25)}`,tipo:pick(['corrente','digital']),moeda:'BRL'});
for(let i=0;i<counts.Transacao;i++) addNode('Transacao',i,`TX-${randInt(100000,999999)}`,{valor:randInt(100,250000),data:`2025-${String(randInt(1,12)).padStart(2,'0')}-${String(randInt(1,28)).padStart(2,'0')}`,moeda:'BRL'});
for(let i=0;i<counts.Produto;i++) addNode('Produto',i,`Produto ${i}`,{categoria:pick(departments),preco:randInt(20,5000)});
for(let i=0;i<counts.Fatura;i++) addNode('Fatura',i,`FAT-${i}`,{valor:randInt(1000,150000),dataEmissao:`2025-${String(randInt(1,12)).padStart(2,'0')}-${String(randInt(1,28)).padStart(2,'0')}`,dataVencimento:`2026-${String(randInt(1,12)).padStart(2,'0')}-${String(randInt(1,28)).padStart(2,'0')}`,status:pick(['aberta','paga','atrasada'])});
for(let i=0;i<counts.Projeto;i++) addNode('Projeto',i,`Projeto ${i}`,{departamento:pick(departments)});
for(let i=0;i<counts.Documento;i++) addNode('Documento',i,`DOC-${i}.pdf`,{tipo:pick(['contrato','nota_fiscal','relatorio'])});

let edgeCount=0; const addEdge=(type,source,target,properties={})=>edges.push({id:`edge_${edgeCount++}`,type,source:source.id,target:target.id,properties});
byType.Pessoa.forEach(p=>{const e=pick(byType.Empresa);addEdge('EMPLOYED_IN',p,e,{papel:p.properties.papel}); const c=pick(byType.Conta);addEdge('OWNS_ACCOUNT',p,c);picks(byType.Transacao,randInt(2,5)).forEach(tx=>{addEdge('PAYS',p,tx);addEdge('RECEIVES',e,tx);addEdge('CONTAINS_ITEM',tx,pick(byType.Produto),{qtd:randInt(1,10)});});addEdge('WORKS_ON',p,pick(byType.Projeto));});
byType.Empresa.forEach(e=>{picks(byType.Produto,randInt(1,8)).forEach(p=>addEdge('SUPPLIES',e,p)); picks(byType.Fatura,randInt(1,4)).forEach(f=>addEdge('ISSUED_FOR',f,e)); if(Math.random()>0.5) addEdge('HAS_DOCUMENT',e,pick(byType.Documento));});
byType.Projeto.forEach(p=>{if(Math.random()>0.5) addEdge('HAS_DOCUMENT',p,pick(byType.Documento));});

fs.mkdirSync(path.resolve('data'),{recursive:true});
fs.writeFileSync(path.resolve('data/graph.json'), JSON.stringify({nodes,edges},null,2));
console.log(`Graph generated with ${nodes.length} nodes and ${edges.length} edges`);
