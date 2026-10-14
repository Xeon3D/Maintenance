import type { HelpShot, HelpText } from "@/lib/help";

export const shots: HelpShot[] = [
  { name: "work-orders-list", path: "/work-orders" },
  { name: "work-orders-board", path: "/work-orders?view=board" },
  { name: "work-orders-form", path: "/work-orders/new", maxHeight: 1100 },
  { name: "work-orders-detail", path: "/work-orders?status=all", open: "CCTV quarterly health check", maxHeight: 1400 },
];

const text: HelpText = {
  en: `# Work orders

A work order is one job at a villa: what has to be done, where, by whom and by when. This is where jobs are planned, carried out and closed, with the checklist, photos, time, parts, the client's signature and the PDF service report.

## What work orders are for

Every piece of work goes through a work order, whatever started it:

- created by hand with **New work order** (or from the button on an asset or villa page, which fills in the place for you);
- approved from a client [request](/help/requests), which turns into a work order with the client's photos;
- generated automatically by a [preventive maintenance](/help/preventive) schedule or a [meter](/help/meters) alert.

Each work order gets a number (**#12**) that never changes. If the villa is covered by a [service contract](/help/contracts), the work order is linked to it automatically and shows its response and resolution deadlines.

## The work orders list

![The work orders list with its views, filters and columns](work-orders-list)

The list shows, for each work order:

- **Title**, with the number in front and, underneath, the system, the priority and any categories.
- **Status**: the current stage of the job (see below).
- **Location**: the villa and, in smaller text, the asset.
- **Assigned to**: the people doing the job.
- **Due**: the deadline. It turns red when the job is overdue.

The most urgent jobs come first: sorted by due date (jobs without a due date last), then by priority.

### Filters

By default the list shows only active jobs (**Open & in progress**, which also includes jobs on hold). Use the filters at the top to narrow it down:

- the search box finds a word in the title or description, or a number such as **#12**;
- status (**All statuses** includes done and cancelled jobs);
- **Assigned to me**, **Unassigned** or a specific person;
- villa, system, priority and category;
- **Overdue only**.

The filters are part of the page address, so you can bookmark a filtered list (for example "my overdue jobs").

### Board and calendar views

The buttons above the filters switch between **List**, **Board** and **Calendar**. The filters you set are kept when you switch.

![The board: one column per status](work-orders-board)

- **Board** shows a column per status: **Open**, **In progress**, **On hold** and **Done** (jobs finished in the last 14 days). Drag a card to another column to change its status. The same rules apply as on the work order page: a job can't be dropped in **Done** until its required checklist steps and the client sign-off are complete, and an error appears at the top if it can't move.
- **Calendar** shows a month of work orders on their due date, coloured by status (cancelled jobs are left out). Preventive maintenance visits that are planned but not yet generated appear with a dashed outline and open the schedule. Use the arrows to move between months.

## Creating a work order

1. Click **New work order**.
2. Type a **Title** that says what's wrong or what to do, for example "Cinema projector not powering on".
3. Optionally choose a **Procedure**: its steps are copied into the work order's checklist (and its name becomes the title if you left the title empty).
4. Add a **Description** with the details.
5. Choose the **Villa**, then the **Area / room** and the **Asset**. The asset sets the **System** for you.
6. Set the **Type** (Reactive, Preventive, Inspection, Installation, Corrective or Emergency) and the **Priority**.
7. Set the **Start** and **Due** dates and the **Estimated hours** if you know them.
8. Choose a **Team** and the people under **Assigned to**. Picking a team selects its members when nobody is assigned yet.
9. Tick any **Categories** that apply (for example Warranty or Billable).
10. Click **Create**. You're taken to the new work order, and the people assigned are notified.

![The new work order form](work-orders-form)

> **Visible to the client in their portal** is ticked by default, so the client can follow the job in the client portal. Untick it for internal work the client shouldn't see.

> Only people whose role can carry out work orders appear under **Assigned to**. When a technician creates a work order, they are assigned to it automatically.

To change a work order later, open it and click **Edit**. If you change the villa or the system, the work order is linked again to the matching contract.

## The work order page

![A work order: status, checklist and activity on the left; details, time, files, parts, costs and sign-off on the right](work-orders-detail)

At the top are the title, the status, the system, the priority and, if it applies, **Overdue**. The buttons on the right open the **Service report** (PDF), **Edit** the work order and delete it.

On the right, the details card sums up the job: villa, client, area, asset, type, dates, team, categories, who it's assigned to, who created and completed it, the request it came from and the contract. Below it are the panels for time, photos and files, parts, costs, client sign-off and e-mailing the report.

## Statuses

The status buttons at the top of the page move the job along:

- **Open**: created, nobody has started yet.
- **In progress**: someone is working on it. This happens on its own when someone starts the timer, logs time or answers the first checklist step.
- **On hold**: waiting for something. The app asks why (for example "waiting for parts"); the reason appears in the activity.
- **Done**: finished. All required checklist steps must be answered and the client sign-off must be done first.
- **Cancelled**: use **Cancel work order** under the status buttons when the job is no longer needed.

To reopen a finished job, click **Open** or **In progress** again. Running timers stop automatically when a job is marked done or cancelled. The creator and the people assigned are notified of every status change, and when a job from a client request is done and visible to the client, the client is told too.

> A done or cancelled work order is closed: its checklist can't be answered or edited, and the time and sign-off panels are locked. Reopen it to make changes.

## The checklist

The checklist is the list of steps for the job. The counter next to its title (for example **3/5**) and the green bar show how far along it is. Steps marked with a red asterisk are required.

Each step has its own kind of answer:

- **Checkbox**: tick it when done.
- **Pass / flag / fail**: choose **Pass**, **Flag** or **Fail**.
- **Multiple choice**: choose one of the options.
- **Text** and **Number**: type the answer. It's saved when you leave the field.
- **Meter reading**: type the value. If the step is linked to a meter on the asset, the reading is also recorded on the meter (where it can trigger alerts and meter-based maintenance).
- **Photo**: **Add photo** opens the camera on a phone.
- **Signature**: **Sign** opens a pad; **Save signature** stores it.

Under each answer you can see who gave it. Click an answer again to clear it.

### Changing the steps

Click **Edit** in the checklist header to add, move (arrows) or delete steps. At the bottom, choose the kind of step, type it, tick **Required** if needed and click **Add**. You can also append all the steps of a procedure with **Add steps from procedure**. Click **Done** when you've finished. See [Procedures](/help/procedures) to build reusable checklists.

## Activity and comments

The **Activity** card lists comments and status changes, oldest first. To add an update, type in the box and click **Post**; **Photo** attaches pictures to the comment.

Type **@** followed by a name to mention a colleague: they get a notification. The creator and the people assigned are notified of every comment. See [Notifications](/help/notifications).

## Time

The **Time** panel records who worked on the job and for how long:

1. Click **Start timer** when you start. The button turns into **Stop** with a running clock.
2. Click **Stop** when you finish. The time is rounded to the minute.

Forgot to start the timer? Click **Log time** and enter the **Date**, the **Minutes** and an optional note. The list shows each entry and the **Total**. You can delete your own entries; managers can delete anyone's.

Below the total, **Billed** shows the time that is charged: each technician's time on the job rounded up to whole blocks (30 minutes unless your company chose otherwise in [Settings → Organization](/help/organization)). For example, 34 minutes logged by one technician bill as 1 hour. The minutes logged stay as they are.

## Photos and files

**Add photos or files** uploads pictures (JPEG, PNG, WebP) or PDFs of up to 15 MB, for example before-and-after photos or a commissioning sheet. Click a thumbnail to open it. You can delete your own files; managers can delete any.

## Parts used

The **Parts used** panel takes parts out of stock for the job:

1. Click **Log parts used**, or **Scan barcode** to pick a part with the camera.
2. Choose the part. Parts linked to the work order's asset are listed first, under **Fits this asset**.
3. Choose the stock location. It starts on your own van if you have one, otherwise on the warehouse. The panel shows how many are available there.
4. Enter the quantity.
5. Optionally record the serial numbers of the units you fitted: type one in **Serial number (optional)** and press Enter or the **+** button, or read it from the label with the camera button (a barcode, or the printed text with **Read text**). You can add at most one serial number per unit; remove one with its cross.
6. Click **Add**.

The stock goes down straight away. The serial numbers are shown under the part (**S/N**) on the work order and in the service report. If a part wasn't used after all, the return button (**Return to stock**) puts it back. People who can place purchase orders also see **Order parts**, which starts a purchase order for this job. See [Parts](/help/parts) and [Purchase orders](/help/purchase-orders).

## Costs

The **Costs** panel adds up what the job cost:

- **Labour**: the billed time (each technician's time rounded up to the company's blocks), at the hourly rate of each person's role.
- **Parts**: the parts used, at their unit cost.
- **Urgent surcharge**, on work orders with Urgent priority: the fixed amount plus the percentage of labour set in [Settings → Organization](/help/organization) or in the work order's contract.
- Other costs added with **Add cost** (a description and an amount, for example crane hire or parking).
- **Total**.

Costs stay internal: they are never shown to the client or printed on the service report.

## Client sign-off

Before a job can be marked done, the client confirms the work:

1. Click **Collect signature** and hand the device to the client or the house manager.
2. They sign on the pad and type their full name.
3. Click **Confirm sign-off**.

If nobody is there to sign, tick **Client absent** instead. The signature can be cleared (**Clear**) while the job is still open; once it's done, reopen the job to change the sign-off.

## The service report

**Service report** opens a PDF for the client with the job details, description, checklist answers, the time billed per technician, parts used (with their serial numbers), photos and the signature (or a note that the client was absent). It never includes costs.

To send it, use the **E-mail the service report** panel:

1. The suggested recipients are already ticked: the client's e-mail, the client's contacts who receive reports, extra report addresses set on the client, and the company's own copies. Untick anyone who shouldn't receive it.
2. Add other addresses under **Other addresses (one per line)** if needed.
3. Click **Send report**.

Each address gets its own e-mail, so recipients don't see each other. The panel then shows when the report was last sent and to how many addresses.

> If e-mail isn't set up on the server, the report can't be sent. An administrator sets it up in [Settings → Server](/help/server). The company's report copies are set in [Settings → Organization](/help/organization).

## Contracts and SLA

When a work order is covered by a service contract, the details card shows the contract plus **Respond by** and **Resolve by** with a badge:

- **Due**: the deadline hasn't passed yet.
- **Met**: the job was started (for the response) or done (for the resolution) in time.
- **Breached**: the deadline was missed.
- **Paused**: the clock is stopped while the job is on hold, if the contract says so.

The response counts as given when the job first goes **In progress** (or straight to **Done**). See [Service contracts](/help/contracts).

## Categories

Categories are coloured labels such as Warranty, Billable or Callout. Tick them on the work order form, then filter the list by category. Categories are managed in [Settings → Categories](/help/categories).

## Who can do what

- **Super Admin**, **Administrator** and **Manager**: everything, including editing and deleting any work order and e-mailing service reports.
- **Technician**: creates work orders, edits those they created or are assigned to, and carries out any job: status, checklist, comments, time, photos, parts, costs and sign-off.
- **Accountant** and **Viewer**: can see work orders (including costs) and download the PDF report, but can't change anything.
- **Clients** don't use this page: they see the jobs visible to them in the client portal.

> Technicians in the field can do all of this offline in the [Field app](/help/field-app).
`,
  pt: `# Ordens de trabalho

Uma ordem de trabalho é um trabalho numa moradia: o que há a fazer, onde, por quem e até quando. É aqui que os trabalhos são planeados, executados e fechados, com a checklist, fotografias, tempo, peças, a assinatura do cliente e o relatório de serviço em PDF.

## Para que servem as ordens de trabalho

Todo o trabalho passa por uma ordem de trabalho, seja qual for a origem:

- criada à mão com **Nova ordem de trabalho** (ou a partir do botão na página de um equipamento ou de uma moradia, que preenche o local por si);
- aprovada a partir de um [pedido](/help/requests) do cliente, que se transforma numa ordem de trabalho com as fotografias do cliente;
- gerada automaticamente por um plano de [manutenção preventiva](/help/preventive) ou por um alerta de [contador](/help/meters).

Cada ordem de trabalho recebe um número (**#12**) que nunca muda. Se a moradia estiver abrangida por um [contrato de manutenção](/help/contracts), a ordem de trabalho fica ligada a ele automaticamente e mostra os prazos de resposta e de resolução.

## A lista de ordens de trabalho

![A lista de ordens de trabalho com as vistas, os filtros e as colunas](work-orders-list)

A lista mostra, para cada ordem de trabalho:

- **Título**, com o número à frente e, por baixo, o sistema, a prioridade e as categorias.
- **Estado**: a fase em que o trabalho está (ver abaixo).
- **Localização**: a moradia e, em letra mais pequena, o equipamento.
- **Atribuída a**: as pessoas que fazem o trabalho.
- **Prazo**: a data limite. Fica a vermelho quando o trabalho está em atraso.

Os trabalhos mais urgentes aparecem primeiro: ordenados pelo prazo (os que não têm prazo no fim) e depois pela prioridade.

### Filtros

Por defeito a lista mostra apenas os trabalhos ativos (**Abertas e em curso**, que inclui também as que estão em espera). Use os filtros no topo para restringir a lista:

- a caixa de pesquisa encontra uma palavra no título ou na descrição, ou um número como **#12**;
- estado (**Todos os estados** inclui as concluídas e as canceladas);
- **Atribuídas a mim**, **Sem atribuição** ou uma pessoa em concreto;
- moradia, sistema, prioridade e categoria;
- **Só em atraso**.

Os filtros fazem parte do endereço da página, por isso pode guardar uma lista filtrada nos favoritos (por exemplo, "os meus trabalhos em atraso").

### Vistas de quadro e calendário

Os botões acima dos filtros alternam entre **Lista**, **Quadro** e **Calendário**. Os filtros escolhidos mantêm-se quando muda de vista.

![O quadro: uma coluna por estado](work-orders-board)

- O **Quadro** mostra uma coluna por estado: **Aberta**, **Em curso**, **Em espera** e **Concluída** (trabalhos terminados nos últimos 14 dias). Arraste um cartão para outra coluna para mudar o estado. Aplicam-se as mesmas regras da página da ordem de trabalho: um trabalho não pode ir para **Concluída** sem os passos obrigatórios da checklist e a aprovação do cliente, e aparece um erro no topo se não puder ser movido.
- O **Calendário** mostra um mês de ordens de trabalho na data do prazo, com a cor do estado (as canceladas não aparecem). As visitas de manutenção preventiva planeadas mas ainda não geradas aparecem com contorno tracejado e abrem o plano. Use as setas para mudar de mês.

## Criar uma ordem de trabalho

1. Clique em **Nova ordem de trabalho**.
2. Escreva um **Título** que diga o que se passa ou o que há a fazer, por exemplo "Projetor do cinema não liga".
3. Opcionalmente, escolha um **Procedimento**: os seus passos são copiados para a checklist da ordem de trabalho (e o nome passa a ser o título, se o deixou vazio).
4. Acrescente uma **Descrição** com os pormenores.
5. Escolha a **Moradia**, depois a **Área / divisão** e o **Equipamento**. O equipamento define o **Sistema** por si.
6. Defina o **Tipo** (Reativa, Preventiva, Inspeção, Instalação, Corretiva ou Emergência) e a **Prioridade**.
7. Defina as datas de **Início** e **Prazo** e as **Horas estimadas**, se as souber.
8. Escolha uma **Equipa** e as pessoas em **Atribuída a**. Ao escolher uma equipa, os seus membros ficam selecionados se ainda não houver ninguém atribuído.
9. Marque as **Categorias** que se aplicam (por exemplo, Garantia ou Faturável).
10. Clique em **Criar**. Abre-se a nova ordem de trabalho e as pessoas atribuídas são notificadas.

![O formulário de nova ordem de trabalho](work-orders-form)

> **Visível para o cliente no portal** vem marcado por defeito, para que o cliente possa acompanhar o trabalho no portal do cliente. Desmarque-o para trabalho interno que o cliente não deve ver.

> Em **Atribuída a** só aparecem as pessoas cuja função pode executar ordens de trabalho. Quando um técnico cria uma ordem de trabalho, fica atribuído a ela automaticamente.

Para alterar uma ordem de trabalho mais tarde, abra-a e clique em **Editar**. Se mudar a moradia ou o sistema, a ordem de trabalho volta a ser ligada ao contrato correspondente.

## A página da ordem de trabalho

![Uma ordem de trabalho: estado, checklist e atividade à esquerda; detalhes, tempo, ficheiros, peças, custos e aprovação à direita](work-orders-detail)

No topo estão o título, o estado, o sistema, a prioridade e, se for o caso, **Em atraso**. Os botões à direita abrem o **Relatório de serviço** (PDF), permitem **Editar** a ordem de trabalho e eliminá-la.

À direita, o cartão de detalhes resume o trabalho: moradia, cliente, área, equipamento, tipo, datas, equipa, categorias, a quem está atribuída, quem a criou e concluiu, o pedido de origem e o contrato. Por baixo estão os painéis de tempo, fotografias e ficheiros, peças, custos, aprovação do cliente e envio do relatório por e-mail.

## Estados

Os botões de estado no topo da página fazem avançar o trabalho:

- **Aberta**: criada, ninguém começou ainda.
- **Em curso**: alguém está a trabalhar nela. Acontece sozinho quando alguém inicia o cronómetro, regista tempo ou responde ao primeiro passo da checklist.
- **Em espera**: à espera de alguma coisa. A aplicação pergunta porquê (por exemplo, "a aguardar material"); o motivo aparece na atividade.
- **Concluída**: terminada. Antes disso, todos os passos obrigatórios da checklist têm de estar respondidos e a aprovação do cliente feita.
- **Cancelada**: use **Cancelar ordem de trabalho**, por baixo dos botões de estado, quando o trabalho já não é necessário.

Para reabrir um trabalho terminado, clique de novo em **Aberta** ou **Em curso**. Os cronómetros a decorrer param automaticamente quando um trabalho é concluído ou cancelado. Quem criou a ordem e as pessoas atribuídas são notificados de cada mudança de estado e, quando um trabalho vindo de um pedido de cliente é concluído e está visível para o cliente, o cliente também é avisado.

> Uma ordem de trabalho concluída ou cancelada está fechada: a checklist não pode ser respondida nem editada, e os painéis de tempo e de aprovação ficam bloqueados. Reabra-a para fazer alterações.

## A checklist

A checklist é a lista de passos do trabalho. O contador junto ao título (por exemplo, **3/5**) e a barra verde mostram o progresso. Os passos com um asterisco vermelho são obrigatórios.

Cada passo tem o seu tipo de resposta:

- **Caixa de verificação**: marque-a quando estiver feito.
- **OK / alerta / falha**: escolha **OK**, **Alerta** ou **Falha**.
- **Escolha múltipla**: escolha uma das opções.
- **Texto** e **Número**: escreva a resposta. É guardada quando sai do campo.
- **Leitura de contador**: escreva o valor. Se o passo estiver ligado a um contador do equipamento, a leitura fica também registada no contador (onde pode gerar alertas e manutenção por contador).
- **Fotografia**: **Adicionar fotografia** abre a câmara no telemóvel.
- **Assinatura**: **Assinar** abre um quadro de assinatura; **Guardar assinatura** guarda-a.

Por baixo de cada resposta vê quem a deu. Clique de novo numa resposta para a apagar.

### Alterar os passos

Clique em **Editar** no cabeçalho da checklist para acrescentar, mover (setas) ou eliminar passos. No fundo, escolha o tipo de passo, escreva-o, marque **Obrigatório** se for o caso e clique em **Adicionar**. Também pode acrescentar todos os passos de um procedimento com **Adicionar passos de um procedimento**. Clique em **Concluir** quando terminar. Veja [Procedimentos](/help/procedures) para criar checklists reutilizáveis.

## Atividade e comentários

O cartão **Atividade** lista os comentários e as mudanças de estado, do mais antigo para o mais recente. Para acrescentar uma atualização, escreva na caixa e clique em **Publicar**; **Fotografia** junta imagens ao comentário.

Escreva **@** seguido de um nome para mencionar um colega: ele recebe uma notificação. Quem criou a ordem e as pessoas atribuídas são notificados de cada comentário. Veja [Notificações](/help/notifications).

## Tempo

O painel **Tempo** regista quem trabalhou no trabalho e durante quanto tempo:

1. Clique em **Iniciar cronómetro** quando começar. O botão passa a **Parar**, com um relógio a contar.
2. Clique em **Parar** quando terminar. O tempo é arredondado ao minuto.

Esqueceu-se de iniciar o cronómetro? Clique em **Registar tempo** e indique a **Data**, os **Minutos** e uma nota opcional. A lista mostra cada registo e o **Total**. Pode eliminar os seus próprios registos; os gestores podem eliminar os de qualquer pessoa.

Por baixo do total, **Faturado** mostra o tempo que é cobrado: o tempo de cada técnico no trabalho arredondado para cima a blocos inteiros (30 minutos, a não ser que a empresa tenha escolhido outro valor em [Definições → Empresa](/help/organization)). Por exemplo, 34 minutos registados por um técnico são faturados como 1 hora. Os minutos registados mantêm-se.

## Fotografias e ficheiros

**Adicionar fotografias ou ficheiros** carrega imagens (JPEG, PNG, WebP) ou PDF até 15 MB, por exemplo fotografias do antes e depois ou uma folha de comissionamento. Clique numa miniatura para a abrir. Pode eliminar os seus próprios ficheiros; os gestores podem eliminar qualquer um.

## Peças usadas

O painel **Peças usadas** retira peças do stock para o trabalho:

1. Clique em **Registar peças usadas**, ou em **Ler código de barras** para escolher uma peça com a câmara.
2. Escolha a peça. As peças ligadas ao equipamento da ordem de trabalho aparecem primeiro, em **Compatíveis com este equipamento**.
3. Escolha o local de stock. Começa na sua carrinha, se tiver uma, ou no armazém. O painel mostra quantas há disponíveis nesse local.
4. Indique a quantidade.
5. Opcionalmente, registe os números de série das unidades instaladas: escreva um em **N.º de série (opcional)** e prima Enter ou o botão **+**, ou leia-o da etiqueta com o botão da câmara (um código de barras, ou o texto impresso com **Ler texto**). Pode acrescentar no máximo um número de série por unidade; retire um com a respetiva cruz.
6. Clique em **Adicionar**.

O stock desce de imediato. Os números de série aparecem por baixo da peça (**N/S**) na ordem de trabalho e no relatório de serviço. Se afinal uma peça não foi usada, o botão de devolução (**Devolver ao stock**) repõe-na. Quem pode fazer encomendas vê também **Encomendar peças**, que inicia uma encomenda para este trabalho. Veja [Peças](/help/parts) e [Encomendas](/help/purchase-orders).

## Custos

O painel **Custos** soma o que o trabalho custou:

- **Mão de obra**: o tempo faturado (o tempo de cada técnico arredondado aos blocos da empresa), ao preço por hora da função de cada pessoa.
- **Peças**: as peças usadas, ao custo unitário.
- **Custo extra de urgência**, nas ordens de trabalho com prioridade Urgente: o valor fixo mais a percentagem da mão de obra definidos em [Definições → Empresa](/help/organization) ou no contrato da ordem de trabalho.
- Outros custos acrescentados com **Adicionar custo** (uma descrição e um valor, por exemplo aluguer de grua ou estacionamento).
- **Total**.

Os custos são internos: nunca são mostrados ao cliente nem impressos no relatório de serviço.

## Aprovação do cliente

Antes de um trabalho poder ser concluído, o cliente confirma o trabalho:

1. Clique em **Recolher assinatura** e passe o dispositivo ao cliente ou ao governante.
2. A pessoa assina no quadro e escreve o nome completo.
3. Clique em **Confirmar aprovação**.

Se não estiver ninguém para assinar, marque **Cliente ausente**. A assinatura pode ser apagada (**Limpar**) enquanto o trabalho está aberto; depois de concluído, reabra o trabalho para mudar a aprovação.

## O relatório de serviço

**Relatório de serviço** abre um PDF para o cliente com os dados do trabalho, a descrição, as respostas da checklist, o tempo faturado de cada técnico, as peças usadas (com os números de série), as fotografias e a assinatura (ou a indicação de que o cliente estava ausente). Nunca inclui custos.

Para o enviar, use o painel **Enviar o relatório de serviço por e-mail**:

1. Os destinatários sugeridos já vêm marcados: o e-mail do cliente, os contactos do cliente que recebem relatórios, os endereços extra definidos no cliente e as cópias da própria empresa. Desmarque quem não deve receber.
2. Acrescente outros endereços em **Outros endereços (um por linha)**, se necessário.
3. Clique em **Enviar relatório**.

Cada endereço recebe o seu próprio e-mail, por isso os destinatários não se veem uns aos outros. O painel passa a mostrar quando foi o último envio e para quantos endereços.

> Se o e-mail não estiver configurado no servidor, o relatório não pode ser enviado. Um administrador configura-o em [Definições → Servidor](/help/server). As cópias dos relatórios para a empresa definem-se em [Definições → Organização](/help/organization).

## Contratos e SLA

Quando uma ordem de trabalho está abrangida por um contrato de manutenção, o cartão de detalhes mostra o contrato e ainda **Responder até** e **Resolver até**, com um indicador:

- **Em prazo**: o prazo ainda não passou.
- **Cumprido**: o trabalho foi iniciado (resposta) ou concluído (resolução) a tempo.
- **Falhado**: o prazo foi ultrapassado.
- **Em pausa**: o relógio está parado enquanto o trabalho está em espera, se o contrato o previr.

A resposta conta como dada quando o trabalho passa pela primeira vez a **Em curso** (ou diretamente a **Concluída**). Veja [Contratos de manutenção](/help/contracts).

## Categorias

As categorias são etiquetas coloridas como Garantia, Faturável ou Chamada. Marque-as no formulário da ordem de trabalho e depois filtre a lista por categoria. As categorias gerem-se em [Definições → Categorias](/help/categories).

## Quem pode fazer o quê

- **Super Admin**, **Administrador** e **Gestor**: tudo, incluindo editar e eliminar qualquer ordem de trabalho e enviar relatórios de serviço por e-mail.
- **Técnico**: cria ordens de trabalho, edita as que criou ou que lhe estão atribuídas e executa qualquer trabalho: estado, checklist, comentários, tempo, fotografias, peças, custos e aprovação.
- **Contabilista** e **Observador**: veem as ordens de trabalho (incluindo custos) e descarregam o relatório em PDF, mas não alteram nada.
- Os **clientes** não usam esta página: veem os trabalhos visíveis para eles no portal do cliente.

> Os técnicos no terreno podem fazer tudo isto offline na [App de campo](/help/field-app).
`,
};

export default text;
