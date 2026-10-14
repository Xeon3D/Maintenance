import type { HelpShot, HelpText } from "@/lib/help";

export const shots: HelpShot[] = [
  { name: "parts-list", path: "/parts", maxHeight: 620 },
  { name: "parts-detail", path: "/parts", open: "Cat6A keystone jack", maxHeight: 1100 },
  { name: "parts-van", path: "/parts/van", maxHeight: 640 },
];

const text: HelpText = {
  en: `# Parts & inventory

The catalogue of spare parts and consumables you keep, how many there are in each stock location (the warehouse, each van, spares left on site), and every movement in and out.

## What this area is for

**Parts & inventory** answers three questions: what do we keep, where is it, and when do we need to buy more. Every part has one record with its codes, cost and reorder point; the quantity is kept per stock location. Stock only changes through recorded movements (a count, a transfer, a part used on a job, a delivery from a purchase order), so the history of each part always adds up.

## The parts list

![The parts list, with the low-stock badge and the filters at the top](parts-list)

Each row shows the part with its SKU, make and model and preferred vendor, its system, the quantity **On hand** (all locations together), the **Reorder point** and the **Unit cost**. A red **Low stock** badge marks parts that need reordering.

- Search by name, SKU, barcode, make or model.
- **Low stock only** shows just the parts that need reordering; the number in brackets is how many there are.
- Pick a location to see only the parts kept there. The quantity and minimum columns then show that location instead of the total.
- Filter by system, or switch to **Archived** to see parts you no longer stock.
- **CSV** downloads every active part with its total, stock value, a low-stock mark and one column per location.
- **My van** opens the stock of your van, where you load parts from the warehouse or return them (see below).
- **Stock locations** opens the list of warehouses, vans and sites.

## Adding a part

1. Click **New part**.
2. Enter the **Name** and, if you have them, the **SKU / part no.** and **Barcode**. Both can be scanned when logging parts on a job, so use the code printed on the box. The camera button in the **Barcode** field (**Read with the camera**) reads the barcode off the box and fills it in for you.
3. Choose the **System**, and fill in **Manufacturer** and **Model**.
4. Set the **Unit** (pcs, m, box…), the **Unit cost** and the **Reorder point**. A reorder point of 0 means the part's total isn't tracked for low stock.
5. Pick the **Preferred vendor**: it is the vendor the automatic reorder sends this part to.
6. Optionally enter the **Opening stock** and the **Location** where it is, so you don't have to do a separate count.
7. Click **Create**.

On the part's page you can add **Photos & datasheets**, change the details with **Edit**, or **Archive** a part you no longer keep (its history stays).

## The part's page

![A part's page: total on hand, stock by location, the stock forms and the movement history](parts-detail)

At the top is the total on hand (in red when it is low), the details and the **Stock value** (quantity on hand × unit cost). Below it:

- **Stock by location**: the quantity in every active location, with its **Location minimum** if one is set. Click a location to see everything kept there.
- **Stock movements**: the last 25 movements, newest first, with who made them, the work order or purchase order they belong to, and the signed quantity (green in, red out).
- **On order**: open purchase orders that include this part and how much is still to arrive (only for people who handle purchasing).
- **Fits these assets**: the equipment this part is a spare for.

## Counting, transferring and setting minimums

Three forms under **Stock by location** change the stock:

1. **Stock count**: choose the location and enter the **Counted quantity**. The difference from what the app had is recorded as a stock count movement. Use it for the yearly inventory, or whenever the shelf and the app disagree.
2. **Transfer**: move a quantity **From** one location **To** another, for example to restock a van from the warehouse. It is recorded as a transfer out and a transfer in.
3. **Location minimum**: a reorder point for one location only, such as the kit each van should always carry. Leave it blank to remove it.

All three accept an optional note, which appears in the movement history.

> Stock can never go below zero. If a transfer or a job asks for more than the location holds, you get "Not enough stock at that location." and nothing changes. Do a stock count first if the app is wrong.

## My van

**My van** (the button at the top of the parts list) is where technicians look after the stock they carry. On the left is what is in the van, with **In van** and the van's **Minimum**: a red quantity is below the minimum. The minimum is the **Location minimum** set for the van on each part's page.

![My van: the van's stock on the left, loading or returning parts on the right](parts-van)

To load the van or take parts back, use **Load or return** on the right:

1. Choose **Load from warehouse** or **Return to warehouse**, and the warehouse (**From warehouse** or **To warehouse**).
2. Add the parts, as many lines as you need: pick them one by one in **Add a part…** (each shows how many the source location holds), or use **Scan barcode** to pick a part by its barcode or SKU with the camera.
3. When loading, **Add what's short (n)** adds in one go every part that is below the van's minimum, with the quantity that fills the gap (as far as the warehouse has it).
4. Check the quantity on each line; it turns red when it is more than is **Available**. Remove a line with the cross.
5. Optionally write a **Note**, then click the button (for example **Load 3 parts** or **Return 2 parts**).

All the lines move together, or none of them do: if one part is short, you get "Not enough stock at that location." followed by the name of that part, and the lines stay so you can fix the quantity. Each line is recorded as a transfer out and a transfer in, and in the audit log.

If you don't have a van, the page says so: ask whoever manages the inventory to create a van location and set you as its **Technician**. Managers (people who can manage inventory) can open any van with the **Van** picker at the top and load or return parts for it.

## Low stock and reordering

A part is low when its total across all locations is at or below its **Reorder point**, or when any location is at or below its own **Location minimum**. When a count, transfer or job makes a part go low, the people who manage stock get a notification (once, not on every take).

**Reorder low stock** (on the parts list) creates one draft purchase order per preferred vendor for everything that is low, delivered to the main warehouse. The suggested quantity tops the part up to twice its reorder point (or fills the gaps in the location minimums), minus what is already on open purchase orders. Parts without a preferred vendor are skipped and counted in the message. The drafts are then checked and sent as described in [Purchase orders](/help/purchase-orders).

## Stock locations

**Stock locations** lists every place stock is kept, with how many parts, units and what value it holds. Types are **Warehouse**, **Van** and **On site** (spares left at a villa). For a van, set the **Technician** who drives it: parts that technician logs on a work order come out of their van by default (otherwise out of the first warehouse). Create locations with **New location**, rename or retype them with **Edit**, and archive the ones you no longer use.

## Parts on work orders

Technicians record parts in the **Parts used** panel of a work order:

1. Click **Log parts used** (or **Scan barcode** to pick the part by its barcode or SKU).
2. Choose the part. Parts that fit the job's asset are listed first, under **Fits this asset**.
3. Check the location (their van by default) and the quantity. The panel shows how many are available there.
4. Optionally add the **Serial numbers** of the units fitted, typed or read with the camera (at most one per unit).
5. Click **Add**. The stock goes down and the part is charged to the job at its current unit cost.

If a part wasn't used after all, **Return to stock** removes it from the work order and puts the quantity back into the location it came from; the movement history shows "Returned from work order". People who handle purchasing also see **Order parts**, which starts a purchase order linked to the job.

To say which parts fit which equipment, open an asset and use **Compatible spare parts** ("Link a part…"). See [Assets](/help/assets) and [Work orders](/help/work-orders).

## Who can do what

- Everyone in the company (except clients) can see parts, stock and locations, and download the CSV.
- **Super Admin**, **Administrator** and **Manager** create and edit parts and locations, count, transfer and set minimums, and receive low-stock notifications.
- **Technicians** log and return parts on the work orders they work on, load and return parts for their own van in **My van**, and can link compatible parts to assets.
- **Reorder low stock** is for people who handle purchasing (by default Super Admin, Administrator and Manager).
`,
  pt: `# Peças e stock

O catálogo de peças de substituição e consumíveis que mantém, quantas existem em cada local de stock (o armazém, cada carrinha, peças deixadas em obra) e todos os movimentos de entrada e saída.

## Para que serve esta área

**Peças e stock** responde a três perguntas: o que temos, onde está e quando é preciso comprar mais. Cada peça tem um único registo com os seus códigos, custo e ponto de encomenda; a quantidade é guardada por local de stock. O stock só muda através de movimentos registados (uma contagem, uma transferência, uma peça usada num trabalho, uma receção de uma nota de encomenda), por isso o histórico de cada peça bate sempre certo.

## A lista de peças

![A lista de peças, com o indicador de stock baixo e os filtros no topo](parts-list)

Cada linha mostra a peça com a referência, marca e modelo e o fornecedor preferencial, o sistema, a quantidade **Em stock** (todos os locais juntos), o **Ponto de encomenda** e o **Custo unitário**. Um indicador vermelho **Stock baixo** assinala as peças que é preciso repor.

- Pesquise por nome, referência, código de barras, marca ou modelo.
- **Só stock baixo** mostra apenas as peças a repor; o número entre parênteses diz quantas são.
- Escolha um local para ver só as peças que lá estão. As colunas de quantidade e mínimo passam a mostrar esse local em vez do total.
- Filtre por sistema, ou mude para **Arquivado** para ver as peças que já não mantém.
- **CSV** descarrega todas as peças ativas com o total, o valor em stock, a marca de stock baixo e uma coluna por local.
- **A minha carrinha** abre o stock da sua carrinha, onde carrega peças do armazém ou as devolve (ver abaixo).
- **Locais de stock** abre a lista de armazéns, carrinhas e obras.

## Adicionar uma peça

1. Clique em **Nova peça**.
2. Indique o **Nome** e, se os tiver, a **Referência** e o **Código de barras**. Ambos podem ser lidos com a câmara ao registar peças num trabalho, por isso use o código impresso na caixa. O botão da câmara no campo **Código de barras** (**Ler com a câmara**) lê o código de barras da caixa e preenche-o por si.
3. Escolha o **Sistema** e preencha **Fabricante** e **Modelo**.
4. Defina a **Unidade** (un, m, caixa…), o **Custo unitário** e o **Ponto de encomenda**. Um ponto de encomenda de 0 significa que o total da peça não é controlado para stock baixo.
5. Escolha o **Fornecedor preferencial**: é o fornecedor a quem a reposição automática encomenda esta peça.
6. Opcionalmente, indique o **Stock inicial** e o **Local** onde está, para não ter de fazer uma contagem à parte.
7. Clique em **Criar**.

Na página da peça pode adicionar **Fotografias e fichas técnicas**, alterar os dados com **Editar** ou **Arquivar** uma peça que já não mantém (o histórico fica guardado).

## A página da peça

![A página de uma peça: total em stock, stock por local, os formulários de stock e o histórico de movimentos](parts-detail)

No topo está o total em stock (a vermelho quando está baixo), os dados e o **Valor em stock** (quantidade em stock × custo unitário). Por baixo:

- **Stock por local**: a quantidade em cada local ativo, com o **Mínimo do local** se estiver definido. Clique num local para ver tudo o que lá está.
- **Movimentos de stock**: os últimos 25 movimentos, do mais recente para o mais antigo, com quem os fez, a ordem de trabalho ou nota de encomenda a que pertencem e a quantidade com sinal (verde a entrar, vermelho a sair).
- **Em encomenda**: notas de encomenda em aberto que incluem esta peça e quanto falta chegar (só para quem trata das compras).
- **Serve nestes equipamentos**: os equipamentos para os quais esta peça é sobressalente.

## Contar, transferir e definir mínimos

Três formulários em **Stock por local** alteram o stock:

1. **Contagem de stock**: escolha o local e indique a **Quantidade contada**. A diferença em relação ao que a aplicação tinha fica registada como movimento de contagem de stock. Use-a no inventário anual, ou sempre que a prateleira e a aplicação não coincidam.
2. **Transferir**: mova uma quantidade **De** um local **Para** outro, por exemplo para reabastecer uma carrinha a partir do armazém. Fica registada como saída e entrada por transferência.
3. **Mínimo do local**: um ponto de encomenda só para um local, como o kit que cada carrinha deve levar sempre. Deixe vazio para o retirar.

Os três aceitam uma nota opcional, que aparece no histórico de movimentos.

> O stock nunca fica negativo. Se uma transferência ou um trabalho pedir mais do que o local tem, aparece "Não há stock suficiente nesse local." e nada muda. Se a aplicação estiver errada, faça primeiro uma contagem.

## A minha carrinha

**A minha carrinha** (o botão no topo da lista de peças) é onde os técnicos tratam do stock que levam consigo. À esquerda está o que há na carrinha, com **Na carrinha** e o **Mínimo** da carrinha: uma quantidade a vermelho está abaixo do mínimo. O mínimo é o **Mínimo do local** definido para a carrinha na página de cada peça.

![A minha carrinha: o stock da carrinha à esquerda, carregar ou devolver peças à direita](parts-van)

Para carregar a carrinha ou devolver peças, use **Carregar ou devolver** à direita:

1. Escolha **Carregar do armazém** ou **Devolver ao armazém**, e o armazém (**Do armazém** ou **Para o armazém**).
2. Acrescente as peças, tantas linhas quantas precisar: escolha-as uma a uma em **Adicionar peça…** (cada uma mostra quantas há no local de origem), ou use **Ler código de barras** para escolher uma peça pelo código de barras ou referência com a câmara.
3. Ao carregar, **Adicionar o que falta (n)** acrescenta de uma só vez todas as peças abaixo do mínimo da carrinha, com a quantidade que preenche a falta (até onde o armazém tiver).
4. Confirme a quantidade em cada linha; fica a vermelho quando é maior do que o **Disponível**. Retire uma linha com a cruz.
5. Opcionalmente escreva uma **Nota** e clique no botão (por exemplo **Carregar 3 peças** ou **Devolver 2 peças**).

As linhas movem-se todas juntas, ou nenhuma: se faltar stock de uma peça, aparece "Não há stock suficiente nesse local." seguido do nome dessa peça, e as linhas ficam para poder corrigir a quantidade. Cada linha fica registada como saída e entrada por transferência, e no registo de auditoria.

Se não tiver carrinha, a página indica-o: peça a quem gere o inventário que crie um local do tipo carrinha e o indique como **Técnico**. Os gestores (quem pode gerir o inventário) podem abrir qualquer carrinha com o seletor **Carrinha** no topo e carregar ou devolver peças por ela.

## Stock baixo e reposição

Uma peça está com stock baixo quando o total em todos os locais é igual ou inferior ao **Ponto de encomenda**, ou quando algum local está igual ou abaixo do seu **Mínimo do local**. Quando uma contagem, transferência ou trabalho deixa uma peça com stock baixo, quem gere o stock recebe uma notificação (uma vez, não a cada saída).

**Repor stock baixo** (na lista de peças) cria uma nota de encomenda em rascunho por fornecedor preferencial com tudo o que está em falta, a entregar no armazém principal. A quantidade sugerida repõe a peça até ao dobro do ponto de encomenda (ou preenche o que falta nos mínimos dos locais), descontando o que já está em notas de encomenda em aberto. As peças sem fornecedor preferencial são ignoradas e contadas na mensagem. Os rascunhos são depois revistos e enviados como se explica em [Encomendas](/help/purchase-orders).

## Locais de stock

**Locais de stock** lista todos os sítios onde há stock, com quantas peças, unidades e que valor guardam. Os tipos são **Armazém**, **Carrinha** e **Em obra** (peças deixadas numa moradia). Numa carrinha, indique o **Técnico** que a conduz: as peças que esse técnico regista numa ordem de trabalho saem, por defeito, da sua carrinha (senão, do primeiro armazém). Crie locais com **Novo local**, mude o nome ou o tipo com **Editar** e arquive os que já não usa.

## Peças nas ordens de trabalho

Os técnicos registam as peças no painel **Peças usadas** de uma ordem de trabalho:

1. Clique em **Registar peças usadas** (ou em **Ler código de barras** para escolher a peça pelo código de barras ou referência).
2. Escolha a peça. As peças que servem no equipamento do trabalho aparecem primeiro, em **Compatíveis com este equipamento**.
3. Confirme o local (por defeito a carrinha do técnico) e a quantidade. O painel mostra quantas há disponíveis nesse local.
4. Opcionalmente, acrescente os **Números de série** das unidades instaladas, escritos ou lidos com a câmara (no máximo um por unidade).
5. Clique em **Adicionar**. O stock desce e a peça é imputada ao trabalho ao custo unitário atual.

Se afinal uma peça não foi usada, **Devolver ao stock** retira-a da ordem de trabalho e repõe a quantidade no local de onde saiu; o histórico mostra "Devolvido da ordem de trabalho". Quem trata das compras vê também **Encomendar peças**, que inicia uma nota de encomenda ligada ao trabalho.

Para indicar que peças servem em que equipamentos, abra um equipamento e use **Peças de substituição compatíveis** ("Associar uma peça…"). Veja [Equipamentos](/help/assets) e [Ordens de trabalho](/help/work-orders).

## Quem pode fazer o quê

- Todos na empresa (exceto clientes) podem ver peças, stock e locais, e descarregar o CSV.
- **Super Admin**, **Administrador** e **Gestor** criam e editam peças e locais, fazem contagens, transferências e definem mínimos, e recebem as notificações de stock baixo.
- Os **Técnicos** registam e devolvem peças nas ordens de trabalho em que trabalham, carregam e devolvem peças da sua própria carrinha em **A minha carrinha**, e podem associar peças compatíveis a equipamentos.
- **Repor stock baixo** é para quem trata das compras (por defeito Super Admin, Administrador e Gestor).
`,
};

export default text;
