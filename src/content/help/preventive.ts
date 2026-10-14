import type { HelpShot, HelpText } from "@/lib/help";

export const shots: HelpShot[] = [{ name: "preventive-list", path: "/preventive", maxHeight: 560 }, { name: "preventive-new", path: "/preventive/new", maxHeight: 1200 }];

const text: HelpText = {
  en: `# Preventive maintenance

Schedules for recurring maintenance that create work orders automatically, either on a calendar (every month, every quarter, every Monday) or every time a meter has advanced by a set amount.

## What preventive maintenance is for

Most villa systems need regular care: a quarterly CCTV health check, a yearly electrical board inspection, a UPS battery check every few months. Instead of remembering these visits, you set up a **schedule** once and the app opens a **Preventive** work order each time one is due, with the right checklist, villa, asset, team and people already filled in.

## The main screen

**Preventive maintenance** in the menu lists your schedules, sorted by the next due date.

- The four boxes at the top show **PM compliance (90 days)**: of the preventive work orders that were due in the last 90 days, how many were **Done on time**, **Done late** and **Not done yet**. The percentage counts only the ones done on time, and turns red below 80%.
- Each row shows the schedule's **Frequency** (for example **Quarterly** or **Weekly** with the weekdays), the villa and asset, and the **Next due** date. For meter schedules the next due column says how many units are left (for example "in 120 h").
- Under the title you see the system, a **Paused** badge when the schedule is not running, and how many work orders it has generated.
- Filter by **Active**, **Paused** or **All**, by villa and by system, or search by title.

![The schedules list, with PM compliance at the top and the frequency and next due date of each schedule](preventive-list)

## Creating a schedule

1. Click **New schedule**. (You can also start from a procedure with its **Schedule** button, or from a meter with **Schedule by this meter**: the form opens already filled in.)
2. Pick a **Procedure** if the job follows a checklist. Each generated work order gets a copy of it, and the title and system are filled in from the procedure if they are still empty.
3. Give it a **Title**, a **Priority** and, if useful, a **Description**.
4. Choose the **Villa**, then optionally the **Asset** and the **System**.
5. Choose the trigger: **By date** or **By meter reading** (see below).
6. Choose a **Team** and the people in **Assigned to**, and an **Estimated hours** figure if you plan workload.
7. Click **Create**. The schedule page opens, and if something is already due it is created straight away.

![The new schedule form, with the date trigger and the preview of the next occurrences](preventive-new)

## Date-based schedules

With **By date** you set the recurrence:

- **Every** a number of **days**, **weeks**, **months** or **years**. For example every 3 months is shown as **Quarterly**.
- For weekly schedules you can tick the weekdays, for example Monday and Thursday.
- **First due**: the date and time of the first occurrence. The time is kept on every later occurrence, also across daylight-saving changes, in the company's time zone.
- **Ends (optional)**: no occurrences after this date. When the last one has been generated, the schedule shows **Ended**.
- **Create in advance**: how many days before the due date the work order appears (up to 60). The work order gets a start date that many days before its due date, so technicians can plan the visit.

Under the fields, **Next occurrences** previews the next five dates, so you can check the rule before saving. Monthly schedules that start on the 31st fall on the last day of shorter months.

## Meter-based schedules

With **By meter reading** you pick a **Meter** and an interval in **Every (meter units)**, for example every 500 hours of a projector lamp. The asset is taken from the meter.

- When you save, the meter's current reading becomes the starting point.
- Each time a reading is recorded, the app checks how far the meter has moved since the last work order. When it has moved by the interval or more, it creates the work order and starts counting again from that reading.
- The work order is due one day after the reading (or after the **Create in advance** days, if more).
- If a reading is lower than the starting point (the meter was reset or replaced), it simply becomes the new starting point.

> Meters are created on the asset's page. See [Meters](/help/meters) for how readings are recorded.

## How the scheduler works

The scheduler runs automatically in the background every few minutes, so you don't need to do anything for work orders to appear.

- A date-based schedule creates its work order once the due date, minus the **Create in advance** days, has been reached. The schedule then moves on to the next occurrence.
- **Missed occurrences**: if the scheduler could not run for a while (for example the server was off), it does not create a backlog. It creates one work order for the earliest missed date, which shows as overdue, and moves the schedule on to the next date in the future.
- Each occurrence is created only once, even if two runs happen at the same time.
- People in **Assigned to** who have since left the company, or whose role no longer carries out work orders, are skipped instead of blocking the work order.

**Run scheduler**, at the top of the list, runs it right now for your company and tells you how many work orders were created (or **Nothing due**). It's useful right after creating or changing schedules.

## Working with a schedule

Open a schedule to see its details, the **Next due** date with the following occurrences, how many generated work orders were completed on time, and the list of **Generated work orders**.

- **Create next now** creates the work order for the next occurrence immediately, for example when the client asks to bring the visit forward. The schedule then moves on to the following occurrence.
- **Pause** stops the schedule; **Resume** starts it again from the next date in the future. Occurrences that fell while it was paused are not created.
- **Edit** changes any field. The next due date is recalculated, and never lands on a date that already has a generated work order.
- The bin button deletes the schedule. Work orders it already created are kept.

> Changing the procedure only affects future work orders: each generated work order keeps its own copy of the checklist.

## Who can do what

- **Super Admin**, **Administrator** and **Manager** can create, edit, pause, delete and run schedules.
- **Technician**, **Viewer** and **Accountant** can see the schedules and their history, and technicians carry out the generated work orders like any other. See [Work orders](/help/work-orders).
`,
  pt: `# Manutenção preventiva

Planos de manutenção recorrente que criam ordens de trabalho automaticamente, seja por calendário (todos os meses, todos os trimestres, todas as segundas-feiras) seja sempre que um contador avança uma determinada quantidade.

## Para que serve a manutenção preventiva

A maioria dos sistemas de uma moradia precisa de cuidados regulares: uma verificação trimestral de CCTV, uma inspeção anual do quadro elétrico, uma verificação da bateria da UPS de poucos em poucos meses. Em vez de ter de se lembrar destas visitas, cria um **plano** uma vez e a aplicação abre uma ordem de trabalho **Preventiva** sempre que uma vence, já com a checklist, a moradia, o equipamento, a equipa e as pessoas certas.

## O ecrã principal

**Manutenção preventiva** no menu lista os seus planos, ordenados pela próxima data.

- As quatro caixas no topo mostram o **Cumprimento preventivo (90 dias)**: das ordens preventivas com prazo nos últimos 90 dias, quantas foram **Feitas a tempo**, **Feitas com atraso** e quantas estão **Por fazer**. A percentagem conta só as feitas a tempo e fica a vermelho abaixo de 80%.
- Cada linha mostra a **Frequência** do plano (por exemplo **Trimestral** ou **Semanal** com os dias da semana), a moradia e o equipamento, e a **Próxima data**. Nos planos por contador, esta coluna indica quantas unidades faltam (por exemplo "daqui a 120 h").
- Por baixo do título vê o sistema, uma etiqueta **Em pausa** quando o plano não está a correr, e quantas ordens de trabalho já gerou.
- Filtre por **Ativos**, **Em pausa** ou **Todos**, por moradia e por sistema, ou pesquise pelo título.

![A lista de planos, com o cumprimento da preventiva no topo e a frequência e a próxima data de cada plano](preventive-list)

## Criar um plano

1. Clique em **Novo plano**. (Também pode começar a partir de um procedimento, com o botão **Planear**, ou de um contador, com **Planear por este contador**: o formulário abre já preenchido.)
2. Escolha um **Procedimento** se o trabalho seguir uma checklist. Cada ordem gerada recebe uma cópia dela, e o título e o sistema são preenchidos a partir do procedimento se ainda estiverem vazios.
3. Dê-lhe um **Título**, uma **Prioridade** e, se for útil, uma **Descrição**.
4. Escolha a **Moradia** e, opcionalmente, o **Equipamento** e o **Sistema**.
5. Escolha o critério: **Por data** ou **Por leitura de contador** (ver abaixo).
6. Escolha uma **Equipa** e as pessoas em **Atribuída a**, e indique as **Horas estimadas** se planeia a carga de trabalho.
7. Clique em **Criar**. Abre-se a página do plano e, se já houver algo a vencer, é criado de imediato.

![O formulário de novo plano, com o critério por data e a pré-visualização das próximas ocorrências](preventive-new)

## Planos por data

Com **Por data** define a recorrência:

- **A cada** um número de **dias**, **semanas**, **meses** ou **anos**. Por exemplo, a cada 3 meses aparece como **Trimestral**.
- Nos planos semanais pode escolher os dias da semana, por exemplo segunda e quinta-feira.
- **Primeira data**: a data e hora da primeira ocorrência. A hora mantém-se em todas as ocorrências seguintes, também nas mudanças de hora de verão, no fuso horário da empresa.
- **Termina (opcional)**: não há ocorrências depois desta data. Quando a última for gerada, o plano mostra **Terminado**.
- **Criar com antecedência**: quantos dias antes do prazo a ordem de trabalho aparece (até 60). A ordem recebe uma data de início esses dias antes do prazo, para os técnicos poderem planear a visita.

Por baixo dos campos, **Próximas ocorrências** mostra as cinco datas seguintes, para confirmar a regra antes de guardar. Os planos mensais que começam no dia 31 caem no último dia dos meses mais curtos.

## Planos por contador

Com **Por leitura de contador** escolhe um **Contador** e um intervalo em **A cada (unidades do contador)**, por exemplo a cada 500 horas da lâmpada de um projetor. O equipamento é o do contador.

- Ao guardar, a leitura atual do contador passa a ser o ponto de partida.
- Sempre que é registada uma leitura, a aplicação verifica quanto o contador avançou desde a última ordem de trabalho. Quando avançou o intervalo ou mais, cria a ordem e volta a contar a partir dessa leitura.
- A ordem de trabalho tem prazo um dia depois da leitura (ou os dias de **Criar com antecedência**, se forem mais).
- Se uma leitura for inferior ao ponto de partida (o contador foi reposto ou substituído), passa simplesmente a ser o novo ponto de partida.

> Os contadores criam-se na página do equipamento. Veja em [Contadores](/help/meters) como se registam as leituras.

## Como funciona o agendador

O agendador corre automaticamente em segundo plano de poucos em poucos minutos, por isso não precisa de fazer nada para as ordens de trabalho aparecerem.

- Um plano por data cria a sua ordem quando se chega ao prazo menos os dias de **Criar com antecedência**. O plano avança então para a ocorrência seguinte.
- **Ocorrências falhadas**: se o agendador não pôde correr durante algum tempo (por exemplo, com o servidor desligado), não cria um monte de ordens em atraso. Cria uma única ordem para a data falhada mais antiga, que aparece como atrasada, e avança o plano para a próxima data no futuro.
- Cada ocorrência só é criada uma vez, mesmo que duas execuções aconteçam ao mesmo tempo.
- As pessoas em **Atribuída a** que entretanto saíram da empresa, ou cuja função já não executa ordens de trabalho, são ignoradas em vez de impedirem a criação da ordem.

**Executar agendador**, no topo da lista, corre-o de imediato para a sua empresa e indica quantas ordens foram criadas (ou **Nada pendente**). É útil logo depois de criar ou alterar planos.

## Trabalhar com um plano

Abra um plano para ver os detalhes, a **Próxima data** com as ocorrências seguintes, quantas ordens geradas foram concluídas a tempo e a lista de **Ordens de trabalho geradas**.

- **Criar a próxima agora** cria de imediato a ordem da próxima ocorrência, por exemplo quando o cliente pede para antecipar a visita. O plano avança para a ocorrência seguinte.
- **Pausar** para o plano; **Retomar** volta a pô-lo a correr a partir da próxima data no futuro. As ocorrências que caíram durante a pausa não são criadas.
- **Editar** altera qualquer campo. A próxima data é recalculada e nunca coincide com uma data que já tenha uma ordem gerada.
- O botão do caixote do lixo elimina o plano. As ordens de trabalho já criadas são mantidas.

> Mudar o procedimento só afeta ordens futuras: cada ordem gerada mantém a sua própria cópia da checklist.

## Quem pode fazer o quê

- **Super Admin**, **Administrador** e **Gestor** podem criar, editar, pausar, eliminar e executar planos.
- **Técnico**, **Observador** e **Contabilista** podem ver os planos e o seu histórico, e os técnicos executam as ordens geradas como quaisquer outras. Veja [Ordens de trabalho](/help/work-orders).
`,
};

export default text;
