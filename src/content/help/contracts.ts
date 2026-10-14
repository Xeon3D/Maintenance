import type { HelpShot, HelpText } from "@/lib/help";

export const shots: HelpShot[] = [
  { name: "contracts-detail", path: "/contracts", open: "Premium maintenance", maxHeight: 700 },
  { name: "contracts-form", path: "/contracts/new", maxHeight: 1100 },
];

const text: HelpText = {
  en: `# Service contracts

Maintenance agreements with your clients: what they cover, how fast you must respond and resolve, and how many preventive visits are included. Work orders are linked to the right contract automatically, so SLA compliance is measured without extra work.

## What a contract does

A contract belongs to one client and covers either all of that client's villas or a single villa, for all systems or only some of them. While it applies, every work order opened at a covered villa, for a covered system, is linked to it. The work order page then shows a **Respond by** and **Resolve by** time, and the contract page and [Reports](/help/reports) measure whether the targets were met.

## The contracts list

**Service contracts** in the menu lists every contract with its client and villa, **Status**, **Period**, **Service levels** (for example "Respond 4 h · resolve 48 h") and, if you can see costs, the **Monthly fee**. Filter by status or client, or search by name and notes.

An **Active** contract whose end date has passed shows an extra **Past end date** badge: renew it, or set it to **Expired**.

## Creating a contract

1. Click **New contract** (or **New contract** on the client page, which picks the client for you).
2. Give it a **Name**, for example "Premium maintenance 2026".
3. Choose the **Client**, then the **Villa**. Leave **All the client's villas** for a client-wide agreement; otherwise pick one villa. The list shows the villas the client owns (**Owned**) and those it manages (**Managed for other owners**).
4. Set the **Status**, the **Start** date and, if the contract has one, the **End** date. A blank end date means no end; the end day itself is still covered.
5. Under **Service levels**, fill in **Response time (hours)** (until someone starts work), **Resolution time (hours)** (until the job is done) and **Included visits / year**. Any of them can be left empty.
6. Choose how the SLA clock runs (see below).
7. Enter the **Monthly fee**, tick the **Systems covered** (none ticked means every system), add **Notes** such as exclusions or call-out rules, and click **Create**.

![The contract form: client and villa, dates, service levels, clock options and systems](contracts-form)

## How the SLA clock works

The clock starts when the work order is opened. **Response** is met when the job is first put **In progress** (or finished) before the target; **Resolution** is met when it is marked **Done** before the target. Two options change how time is counted:

- **Count business hours only**: the targets run only during the company's business hours, skipping nights, closed days and holidays. The hours and holidays are set in [Settings → Organization](/help/organization).
- **Pause while on hold**: the clock stops while the job is **On hold** (for example waiting for the client or for parts) and resumes when work continues. While paused, the job shows **Paused** with no due date. This option is ticked by default.

Each job's SLA shows as **Met**, **Breached**, **Due** (still running) or **Paused**. Cancelled jobs don't count.

## Statuses

- **Draft**: being prepared; no work orders are linked.
- **Active**: in force; work orders are linked.
- **Expired**: finished. Jobs that were opened between its start and end dates stay linked to it, so history remains correct.
- **Cancelled**: never applies; no work orders are linked.

## Automatic linking

You never pick a contract on a work order. When a work order is created or edited, the app looks for an **Active** or **Expired** contract of the villa's owner, or of its property manager, that covers the villa, the job's system and the date it was opened. If several match, a villa-specific contract wins over a client-wide one, then the one that started most recently.

Saving or deleting a contract re-checks all of the client's work orders, including earlier ones, so adding a contract today also attributes the jobs already opened within its dates. Changing a villa's owner or manager does the same.

> Deleting a contract keeps its work orders, but they lose the SLA link. To end an agreement, set it to **Expired** instead, so its history stays.

## The contract page

![A contract page with SLA compliance, preventive visits and the covered work](contracts-detail)

- **Response SLA · last 90 days** and **Resolution SLA · last 90 days**: the share of jobs that met the target, counting only those already decided (met or breached). Below 90% is shown in red.
- **Preventive visits this contract year**: completed preventive and inspection work orders since the last anniversary of the start date, against the included visits.
- **Covered work**: the latest linked work orders with their response and resolution state.
- On the right, the terms, including the **SLA clock** setting, and any notes.

## Who can do what

- Everyone in the company can see contracts and their compliance.
- **Super Admin**, **Administrator** and **Manager** can create, edit and delete contracts (permission **Service contracts**).
- The **Monthly fee** is only shown to roles with **See costs**. Someone without it can still edit the contract; the stored fee is kept.
`,
  pt: `# Contratos de manutenção

Os acordos de manutenção com os seus clientes: o que abrangem, em quanto tempo tem de responder e resolver, e quantas visitas preventivas estão incluídas. As ordens de trabalho são associadas automaticamente ao contrato certo, por isso o cumprimento do SLA é medido sem trabalho extra.

## O que faz um contrato

Um contrato pertence a um cliente e abrange todas as moradias desse cliente ou uma só moradia, para todos os sistemas ou só para alguns. Enquanto se aplica, cada ordem de trabalho aberta numa moradia abrangida, para um sistema abrangido, fica associada a ele. A página da ordem de trabalho mostra então um **Responder até** e um **Resolver até**, e a página do contrato e os [Relatórios](/help/reports) medem se os prazos foram cumpridos.

## A lista de contratos

**Contratos de manutenção** no menu mostra todos os contratos com o cliente e a moradia, **Estado**, **Período**, **Níveis de serviço** (por exemplo "Resposta 4 h · resolução 48 h") e, se puder ver custos, a **Mensalidade**. Filtre por estado ou cliente, ou pesquise pelo nome e notas.

Um contrato **Ativo** cuja data de fim já passou mostra também o distintivo **Data de fim ultrapassada**: renove-o ou passe-o a **Expirado**.

## Criar um contrato

1. Clique em **Novo contrato** (ou em **Novo contrato** na página do cliente, que escolhe o cliente por si).
2. Dê-lhe um **Nome**, por exemplo "Manutenção Premium 2026".
3. Escolha o **Cliente** e depois a **Moradia**. Deixe **Todas as moradias do cliente** para um acordo de cliente; caso contrário, escolha uma moradia. A lista mostra as moradias do cliente (**Próprias**) e as que ele gere (**Geridas para outros proprietários**).
4. Defina o **Estado**, a data de **Início** e, se o contrato tiver, a data de **Fim**. Uma data de fim vazia significa sem fim; o próprio dia de fim ainda está abrangido.
5. Em **Níveis de serviço**, preencha **Tempo de resposta (horas)** (até alguém começar o trabalho), **Tempo de resolução (horas)** (até o trabalho estar concluído) e **Visitas incluídas / ano**. Qualquer um pode ficar vazio.
6. Escolha como conta o relógio do SLA (ver abaixo).
7. Indique a **Mensalidade**, marque os **Sistemas abrangidos** (nenhum selecionado significa todos), acrescente **Notas** como exclusões ou regras de deslocação, e clique em **Criar**.

![O formulário do contrato: cliente e moradia, datas, níveis de serviço, opções do relógio e sistemas](contracts-form)

## Como funciona o relógio do SLA

O relógio começa quando a ordem de trabalho é aberta. A **Resposta** é cumprida quando o trabalho passa pela primeira vez a **Em curso** (ou é concluído) antes do prazo; a **Resolução** é cumprida quando é marcado como **Concluída** antes do prazo. Duas opções mudam a forma como o tempo é contado:

- **Contar apenas horário laboral**: os prazos só contam durante o horário de funcionamento da empresa, sem noites, dias de fecho nem feriados. O horário e os feriados definem-se em [Definições → Organização](/help/organization).
- **Pausar quando em espera**: o relógio para enquanto o trabalho está **Em espera** (por exemplo, à espera do cliente ou de material) e retoma quando o trabalho continua. Em pausa, o trabalho mostra **Em pausa**, sem data limite. Esta opção vem marcada por defeito.

O SLA de cada trabalho aparece como **Cumprido**, **Falhado**, **Em prazo** (ainda a contar) ou **Em pausa**. Os trabalhos cancelados não contam.

## Estados

- **Rascunho**: em preparação; nenhuma ordem de trabalho é associada.
- **Ativo**: em vigor; as ordens de trabalho são associadas.
- **Expirado**: terminado. Os trabalhos abertos entre as datas de início e fim continuam associados, para que o histórico fique correto.
- **Cancelado**: nunca se aplica; nenhuma ordem de trabalho é associada.

## Associação automática

Nunca escolhe um contrato numa ordem de trabalho. Quando uma ordem de trabalho é criada ou editada, a aplicação procura um contrato **Ativo** ou **Expirado** do proprietário da moradia, ou do seu gestor de propriedades, que abranja a moradia, o sistema do trabalho e a data em que foi aberto. Se houver vários, um contrato de uma moradia prevalece sobre um contrato de cliente e, depois, o que começou mais recentemente.

Guardar ou eliminar um contrato volta a verificar todas as ordens de trabalho do cliente, incluindo as anteriores, por isso criar hoje um contrato também lhe atribui os trabalhos já abertos dentro das suas datas. Mudar o proprietário ou o gestor de uma moradia faz o mesmo.

> Eliminar um contrato mantém as ordens de trabalho, mas estas deixam de ter SLA associado. Para terminar um acordo, passe-o antes a **Expirado**, para que o histórico se mantenha.

## A página do contrato

![A página de um contrato com o cumprimento do SLA, as visitas preventivas e o trabalho abrangido](contracts-detail)

- **SLA de resposta · últimos 90 dias** e **SLA de resolução · últimos 90 dias**: a percentagem de trabalhos que cumpriram o prazo, contando só os já decididos (cumpridos ou falhados). Abaixo de 90% aparece a vermelho.
- **Visitas preventivas neste ano de contrato**: ordens de trabalho preventivas e de inspeção concluídas desde o último aniversário da data de início, face às visitas incluídas.
- **Trabalho abrangido**: as últimas ordens de trabalho associadas, com o estado da resposta e da resolução.
- À direita, as condições, incluindo o **Relógio do SLA**, e as notas.

## Quem pode fazer o quê

- Todas as pessoas da empresa podem ver os contratos e o seu cumprimento.
- **Super Admin**, **Administrador** e **Gestor** podem criar, editar e eliminar contratos (permissão **Contratos de serviço**).
- A **Mensalidade** só é mostrada às funções com **Ver custos**. Quem não a tiver pode editar o contrato na mesma; a mensalidade guardada mantém-se.
`,
};

export default text;
