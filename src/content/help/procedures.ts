import type { HelpShot, HelpText } from "@/lib/help";

export const shots: HelpShot[] = [
  { name: "procedures-starters", path: "/procedures", maxHeight: 720 },
  { name: "procedures-editor", path: "/procedures/new", maxHeight: 720 },
];

const text: HelpText = {
  en: `# Procedures

The library of reusable checklists your team follows on site. A procedure is attached to a work order or a preventive schedule, and every work order gets its own copy to fill in.

## What procedures are for

A procedure describes how a job is done, step by step: what to check, what to measure, what to photograph and who signs at the end. Writing it once means every technician follows the same steps, and the answers are recorded on the work order and in the service report.

You use procedures in two places:

- On a **work order**, to give it a checklist.
- On a **preventive schedule**, so that every work order it generates gets the checklist. See [Preventive maintenance](/help/preventive).

## The main screen

**Procedures** in the menu lists the library with, for each procedure, its **System**, the number of **Steps**, how many **Schedules** use it and how many **Work orders** were created with it. Filter by system, switch between **Active** and **Archived**, or search by name and description.

## Starting with ready-made procedures

While your company has fewer than three procedures, the page offers **Start with ready-made procedures**: checklists for common villa systems, such as a quarterly CCTV health check, a network rack inspection, a KNX check, an audio/video check, a lighting control check, an electrical board inspection and an intrusion alarm test.

![The ready-made procedures, all ticked, with the Install button underneath](procedures-starters)

1. Untick the ones you don't need.
2. Click **Install** (the button shows how many will be installed).
3. Open each one and adapt it to the way your team works.

The procedures are installed in the language you are using at that moment.

## Creating or editing a procedure

1. Click **New procedure**, or open an existing one.
2. Give it a **Name**, optionally a **System** and a **Description**.
3. Build the **Steps**. A new procedure starts with a section heading and one step. Use **Add step** and **Add section** to add more, the arrows to move a step up or down, and the bin to remove it.
4. For each step, choose its type, write the label (what the technician has to do) and, if useful, a hint for the technician.
5. Tick **Required** for steps that must be answered. New steps are required by default.
6. Click **Create** (or **Save** when editing).

![The procedure editor with a section heading and a first step](procedures-editor)

A procedure needs a name and at least one step with a label. Steps left without a label are dropped when you save.

## Step types

- **Section heading**: a title that groups the steps below it, such as "Recorder" or "Cameras". It is not answered.
- **Checkbox**: done or not done.
- **Pass / flag / fail**: the usual inspection answer. **Flag** means it works but needs attention.
- **Text**: a free answer, such as notes for the client.
- **Number**: a value with an optional **Unit**, such as a temperature in °C.
- **Multiple choice**: the technician picks one of the options you list, separated by commas (for example: OK, Replace, N/A).
- **Meter reading**: a value with a **Unit**. When the work order is for an asset that has exactly one meter with the same unit, the step is linked to that meter, and the answer is also recorded as a meter reading. See [Meters](/help/meters).
- **Photo**: the technician takes or adds a photo.
- **Signature**: someone signs on the screen, for example the house manager.

> A work order can't be set to **Done** until all its required steps have been answered. Keep **Required** for the steps that really matter, so technicians aren't blocked by optional ones.

## Changes, copies and archiving

- **Changes apply to new work orders only.** Existing work orders keep their own copy of the checklist, so editing a procedure never alters a job already in progress or completed.
- **Duplicate** creates a copy named with "(2)" at the end, a quick way to make a variant for another villa or client.
- **Archive** hides the procedure from the list and from the procedure choice on new schedules; **Restore** brings it back.
- **Schedule** opens a new preventive schedule with this procedure already chosen.
- The **Schedules** box on the right lists the preventive schedules that use the procedure; paused ones are crossed out.

On a work order, the checklist can still be adjusted for that one job with **Edit**, including **Add steps from procedure**. See [Work orders](/help/work-orders).

## Who can do what

- **Super Admin**, **Administrator** and **Manager** can create, edit, duplicate, archive and install procedures.
- **Technician**, **Viewer** and **Accountant** see the library read-only: the steps, with an asterisk on the required ones.
`,
  pt: `# Procedimentos

A biblioteca de checklists reutilizáveis que a equipa segue em obra. Um procedimento associa-se a uma ordem de trabalho ou a um plano preventivo, e cada ordem de trabalho recebe a sua própria cópia para preencher.

## Para que servem os procedimentos

Um procedimento descreve como se faz um trabalho, passo a passo: o que verificar, o que medir, o que fotografar e quem assina no fim. Escrevê-lo uma vez faz com que todos os técnicos sigam os mesmos passos, e as respostas ficam registadas na ordem de trabalho e no relatório de serviço.

Usa procedimentos em dois sítios:

- Numa **ordem de trabalho**, para lhe dar uma checklist.
- Num **plano preventivo**, para que todas as ordens que ele gera recebam a checklist. Veja [Manutenção preventiva](/help/preventive).

## O ecrã principal

**Procedimentos** no menu lista a biblioteca com, para cada procedimento, o **Sistema**, o número de **Passos**, quantos **Planos** o usam e quantas **Ordens de trabalho** foram criadas com ele. Filtre por sistema, alterne entre **Ativo** e **Arquivado**, ou pesquise pelo nome e pela descrição.

## Começar com procedimentos prontos

Enquanto a empresa tiver menos de três procedimentos, a página propõe **Comece com procedimentos prontos**: checklists para os sistemas mais comuns em moradias, como uma verificação trimestral de CCTV, uma inspeção do bastidor de rede, uma verificação de domótica KNX, uma verificação de áudio/vídeo, uma verificação do controlo de iluminação, uma inspeção do quadro elétrico e um teste do alarme de intrusão.

![Os procedimentos prontos, todos selecionados, com o botão Instalar por baixo](procedures-starters)

1. Desmarque os que não precisa.
2. Clique em **Instalar** (o botão indica quantos vão ser instalados).
3. Abra cada um e adapte-o à forma de trabalhar da sua equipa.

Os procedimentos são instalados no idioma que estiver a usar nesse momento.

## Criar ou editar um procedimento

1. Clique em **Novo procedimento**, ou abra um existente.
2. Dê-lhe um **Nome** e, opcionalmente, um **Sistema** e uma **Descrição**.
3. Construa os **Passos**. Um procedimento novo começa com um título de secção e um passo. Use **Adicionar passo** e **Adicionar secção** para acrescentar mais, as setas para subir ou descer um passo e o caixote do lixo para o remover.
4. Para cada passo, escolha o tipo, escreva o texto (o que o técnico tem de fazer) e, se for útil, uma indicação para o técnico.
5. Marque **Obrigatório** nos passos que têm de ser respondidos. Os passos novos são obrigatórios por defeito.
6. Clique em **Criar** (ou **Guardar** quando está a editar).

![O editor de procedimentos com um título de secção e um primeiro passo](procedures-editor)

Um procedimento precisa de um nome e de pelo menos um passo com texto. Os passos sem texto são descartados ao guardar.

## Tipos de passo

- **Título de secção**: um título que agrupa os passos seguintes, como "Gravador" ou "Câmaras". Não tem resposta.
- **Caixa de verificação**: feito ou não feito.
- **OK / alerta / falha**: a resposta habitual numa inspeção. **Alerta** significa que funciona mas precisa de atenção.
- **Texto**: uma resposta livre, como notas para o cliente.
- **Número**: um valor com uma **Unidade** opcional, como uma temperatura em °C.
- **Escolha múltipla**: o técnico escolhe uma das opções que indicar, separadas por vírgulas (por exemplo: OK, Substituir, N/A).
- **Leitura de contador**: um valor com uma **Unidade**. Quando a ordem de trabalho é de um equipamento com exatamente um contador com a mesma unidade, o passo fica ligado a esse contador e a resposta é também registada como leitura. Veja [Contadores](/help/meters).
- **Fotografia**: o técnico tira ou adiciona uma fotografia.
- **Assinatura**: alguém assina no ecrã, por exemplo o responsável da casa.

> Uma ordem de trabalho não pode passar a **Concluída** enquanto todos os passos obrigatórios não estiverem respondidos. Deixe **Obrigatório** só nos passos que importam mesmo, para os técnicos não ficarem bloqueados por passos opcionais.

## Alterações, cópias e arquivo

- **As alterações só se aplicam a novas ordens de trabalho.** As ordens existentes mantêm a sua própria cópia da checklist, por isso editar um procedimento nunca altera um trabalho em curso ou já concluído.
- **Duplicar** cria uma cópia com "(2)" no fim do nome, uma forma rápida de fazer uma variante para outra moradia ou cliente.
- **Arquivar** esconde o procedimento da lista e da escolha de procedimento nos novos planos; **Restaurar** volta a mostrá-lo.
- **Planear** abre um novo plano preventivo com este procedimento já escolhido.
- A caixa **Planos** à direita lista os planos preventivos que usam o procedimento; os que estão em pausa aparecem riscados.

Numa ordem de trabalho, a checklist pode ainda ser ajustada só para esse trabalho com **Editar**, incluindo **Adicionar passos de um procedimento**. Veja [Ordens de trabalho](/help/work-orders).

## Quem pode fazer o quê

- **Super Admin**, **Administrador** e **Gestor** podem criar, editar, duplicar, arquivar e instalar procedimentos.
- **Técnico**, **Observador** e **Contabilista** veem a biblioteca só para leitura: os passos, com um asterisco nos obrigatórios.
`,
};

export default text;
