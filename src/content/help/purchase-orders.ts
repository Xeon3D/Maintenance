import type { HelpShot, HelpText } from "@/lib/help";

export const shots: HelpShot[] = [{ name: "purchase-orders-new", path: "/purchase-orders/new", maxHeight: 700 }];

const text: HelpText = {
  en: `# Purchase orders

Orders to your vendors, from the first draft through approval and ordering to receiving the goods into a stock location.

## What purchase orders are for

A purchase order (PO) lists what you are buying from one vendor, at what price and where it should be delivered. It goes through approval, is marked as ordered when you send it, and is then received, in one go or in several deliveries. Receiving a PO is what puts the parts into stock, so the stock levels in [Parts & inventory](/help/parts) stay right without counting.

## The list

The list shows each order's number (PO-1, PO-2…), vendor, status, expected date and total. By default it shows **Open orders**: everything not yet received or cancelled. Use the status filter for **All statuses** or one status, filter by vendor, or search by PO number, vendor, item or notes. An expected date in red means the order is ordered but late.

## Statuses

- **Draft**: being prepared. Only a draft can be edited (vendor, delivery, items, prices).
- **Awaiting approval**: submitted by someone who can't approve purchases; waits for an approver.
- **Approved**: ready to be sent to the vendor.
- **Ordered**: sent to the vendor; the order date is recorded. Items can now be received.
- **Partly received**: some, but not all, of the items have arrived.
- **Received**: everything has arrived.
- **Cancelled**: will not go ahead. A cancelled order can be reopened as a draft.

## Creating a purchase order

![The new purchase order form](purchase-orders-new)

1. Click **New purchase order**. (You need at least one vendor; see [Vendors](/help/vendors).)
2. Choose the **Vendor** and where to **Deliver to** (the first warehouse is suggested).
3. Optionally set the **Expected** delivery date and link it **For work order** when the parts are for a specific job.
4. Enter **Tax** and **Shipping** if you know them, and any **Notes**: they are printed on the PDF for the vendor.
5. Tick **Add this vendor's low-stock parts** to fill the order with everything from this vendor that is low on stock.
6. Click **Create**. The draft opens.
7. Under **Add item**, pick a part (this vendor's parts are listed first) or **Free text (not a stocked part)** for anything else, such as a service or a one-off item. Enter the **Quantity** and **Unit cost**; leave the cost blank to use the part's current cost, and the item text blank to use the part's name.

While the order is a draft you can edit a line with the pencil, remove it, change the header with **Edit**, or click **Add low-stock parts** to add this vendor's low-stock parts that aren't on the order yet.

> Other ways to start a PO: **Reorder low stock** on the parts list drafts one order per preferred vendor in one click; **Order parts** on a work order starts a PO linked to that job; **New purchase order** on a vendor's page picks the vendor for you.

## Approving and ordering

1. When the draft is complete, a manager clicks **Submit for approval**; it becomes **Awaiting approval** and the approvers are notified. Someone who can approve sees **Approve** straight away on the draft and skips this step.
2. The approver opens it and clicks **Approve**, or **Send back** to return it to draft with changes needed. The person who created the order is notified either way.
3. Send the order to the vendor (the **PDF** button produces a printable purchase order) and click **Mark as ordered**.

An order needs at least one item before it can be submitted or approved.

## Receiving

When the goods arrive, open the order. The **Receive items** box lists every line still outstanding:

1. Enter the quantity that actually arrived on each line (it starts at the full outstanding quantity; set 0 for anything that didn't come).
2. Choose where to **Receive into** (it starts at the order's delivery location).
3. Click **Receive items**.

Stocked parts are added to that location and their unit cost is updated to the price on the order. Lines marked **Not a stocked part** are recorded as received but don't change stock. You can't receive more than is outstanding on a line. The order becomes **Partly received** or **Received**, and each delivery is listed under **Receipts** with who received it and when.

Keep quotes, invoices and delivery notes with the order under **Documents**.

## Cancelling and deleting

- **Cancel order** is available while the order is a draft, awaiting approval, approved, or ordered with nothing received yet. Once anything has been received, the order can't be cancelled; receive the rest or leave it partly received.
- **Reopen as draft** brings a cancelled order back.
- The bin button deletes an order permanently. It only appears on drafts and cancelled orders with nothing received.

## Who can do what

- Purchase orders are only visible to people who handle purchasing: by default **Super Admin**, **Administrator** and **Manager**.
- **Approve** is for **Super Admin** and **Administrator** by default. A **Manager** prepares and submits orders, marks them as ordered and receives them, but can't approve them.
- The Super Admin can change who can purchase and who can approve in [Settings → Roles](/help/roles).
`,
  pt: `# Encomendas

Notas de encomenda aos seus fornecedores, desde o primeiro rascunho, passando pela aprovação e encomenda, até à receção dos artigos num local de stock.

## Para que servem as notas de encomenda

Uma nota de encomenda lista o que está a comprar a um fornecedor, a que preço e onde deve ser entregue. Passa por aprovação, é marcada como encomendada quando a envia e depois é recebida, de uma só vez ou em várias entregas. É a receção da encomenda que dá entrada das peças em stock, por isso os níveis de stock em [Peças e stock](/help/parts) ficam certos sem ser preciso contar.

## A lista

A lista mostra o número de cada nota (PO-1, PO-2…), o fornecedor, o estado, a data prevista e o total. Por defeito mostra **Encomendas em aberto**: tudo o que ainda não foi recebido nem cancelado. Use o filtro de estado para ver **Todos os estados** ou um só estado, filtre por fornecedor, ou pesquise por número, fornecedor, artigo ou notas. Uma data prevista a vermelho significa que a encomenda já foi feita mas está atrasada.

## Estados

- **Rascunho**: em preparação. Só um rascunho pode ser alterado (fornecedor, entrega, artigos, preços).
- **A aguardar aprovação**: submetida por alguém que não pode aprovar compras; aguarda um aprovador.
- **Aprovada**: pronta para enviar ao fornecedor.
- **Encomendada**: enviada ao fornecedor; a data de encomenda fica registada. A partir daqui os artigos podem ser recebidos.
- **Parcialmente recebida**: chegaram alguns artigos, mas não todos.
- **Recebida**: chegou tudo.
- **Cancelada**: não vai avançar. Uma nota cancelada pode ser reaberta como rascunho.

## Criar uma nota de encomenda

![O formulário de nova nota de encomenda](purchase-orders-new)

1. Clique em **Nova nota de encomenda**. (Precisa de pelo menos um fornecedor; veja [Fornecedores](/help/vendors).)
2. Escolha o **Fornecedor** e onde **Entregar em** (é sugerido o primeiro armazém).
3. Opcionalmente, indique a data **Prevista** de entrega e associe-a **Para a ordem de trabalho** quando as peças forem para um trabalho específico.
4. Indique o **IVA** e os **Portes** se os souber, e as **Notas**: aparecem no PDF para o fornecedor.
5. Marque **Adicionar as peças deste fornecedor com stock baixo** para preencher a nota com tudo deste fornecedor que está com stock baixo.
6. Clique em **Criar**. O rascunho abre.
7. Em **Adicionar artigo**, escolha uma peça (as deste fornecedor aparecem primeiro) ou **Texto livre (não é uma peça em stock)** para outra coisa, como um serviço ou um artigo pontual. Indique a **Quantidade** e o **Custo unitário**; deixe o custo vazio para usar o custo atual da peça, e o artigo vazio para usar o nome da peça.

Enquanto a nota for um rascunho, pode alterar uma linha com o lápis, removê-la, mudar o cabeçalho com **Editar**, ou clicar em **Adicionar peças com stock baixo** para juntar as peças deste fornecedor com stock baixo que ainda não estão na nota.

> Outras formas de começar uma nota: **Repor stock baixo** na lista de peças cria, num só clique, um rascunho por fornecedor preferencial; **Encomendar peças** numa ordem de trabalho inicia uma nota ligada a esse trabalho; **Nova nota de encomenda** na página de um fornecedor escolhe-o por si.

## Aprovar e encomendar

1. Quando o rascunho estiver completo, um gestor clica em **Submeter para aprovação**; passa a **A aguardar aprovação** e os aprovadores são notificados. Quem pode aprovar vê logo **Aprovar** no rascunho e salta este passo.
2. O aprovador abre a nota e clica em **Aprovar**, ou em **Devolver** para a mandar de volta a rascunho com alterações a fazer. Quem criou a nota é notificado em qualquer dos casos.
3. Envie a nota ao fornecedor (o botão **PDF** gera uma nota de encomenda para imprimir) e clique em **Marcar como encomendada**.

Uma nota precisa de pelo menos um artigo para poder ser submetida ou aprovada.

## Receber

Quando os artigos chegarem, abra a nota. A caixa **Receber artigos** lista todas as linhas ainda em falta:

1. Indique em cada linha a quantidade que chegou de facto (começa com tudo o que está em falta; ponha 0 no que não veio).
2. Escolha onde **Receber em** (começa no local de entrega da nota).
3. Clique em **Receber artigos**.

As peças em stock entram nesse local e o custo unitário passa a ser o preço da nota. As linhas marcadas **Não é uma peça em stock** ficam registadas como recebidas, mas não alteram o stock. Não pode receber mais do que o que está em falta numa linha. A nota passa a **Parcialmente recebida** ou **Recebida**, e cada entrega fica listada em **Receções**, com quem a recebeu e quando.

Guarde orçamentos, faturas e guias de remessa junto da nota, em **Documentos**.

## Cancelar e eliminar

- **Cancelar encomenda** está disponível enquanto a nota é um rascunho, está a aguardar aprovação, está aprovada, ou está encomendada sem nada recebido. Depois de receber alguma coisa, a nota já não pode ser cancelada; receba o resto ou deixe-a parcialmente recebida.
- **Reabrir como rascunho** recupera uma nota cancelada.
- O botão do caixote do lixo elimina a nota definitivamente. Só aparece em rascunhos e notas canceladas sem nada recebido.

## Quem pode fazer o quê

- As encomendas só são visíveis para quem trata das compras: por defeito **Super Admin**, **Administrador** e **Gestor**.
- **Aprovar** é para o **Super Admin** e o **Administrador**, por defeito. Um **Gestor** prepara e submete notas, marca-as como encomendadas e recebe-as, mas não as aprova.
- O Super Admin pode alterar quem compra e quem aprova em [Definições → Funções](/help/roles).
`,
};

export default text;
