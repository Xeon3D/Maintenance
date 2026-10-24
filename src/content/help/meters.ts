import type { HelpShot, HelpText } from "@/lib/help";

export const shots: HelpShot[] = [{ name: "meters-list", path: "/meters", maxHeight: 520 }];

const text: HelpText = {
  en: `# Meters

Values you track on an asset over time, such as UPS battery charge, disk hours or projector lamp hours. Readings outside the limits can open a work order, and meters can drive preventive schedules.

## What meters are for

A meter belongs to one asset and records a number with a unit: a percentage, hours, degrees. Each reading is kept, so you can see the trend and spot a battery or a disk that is getting worse before it fails. Meters do two more things:

- **Alerts**: when a reading is below the minimum or above the maximum, the app can open a work order on its own.
- **Meter-based maintenance**: a preventive schedule can create a work order every so many units, for example every 500 lamp hours. See [Preventive maintenance](/help/preventive).

## The main screen

**Meters** in the menu lists every meter in the company, grouped by villa and asset.

- **Name**, with the villa and asset underneath (click it to open the asset). A warning triangle means the last reading is out of range.
- **Trend**: a small chart of the last 20 readings, with the limits.
- **Last reading**: the value, in red when out of range, and how long ago it was recorded.
- **Record**: a box to type a new reading.

Filter by villa, choose **Out of range only** to see just the meters that need attention, or search by meter or asset name.

![The meters list, with the trend and the last reading of each meter](meters-list)

## Adding a meter

Meters are created on the asset they measure.

1. Open the asset (see [Assets](/help/assets)) and find the **Meters** box.
2. Click **Add meter**.
3. Fill in the **Name** (for example "Battery charge") and the **Unit** (for example %, h or °C).
4. Optionally set a **Minimum** and a **Maximum**. A reading below the minimum or above the maximum is out of range. You can set only one of them; the minimum must be lower than the maximum.
5. Leave **Open a work order when a reading is out of range** ticked if an out-of-range value should create a job.
6. Click **Add**.

The pencil next to a meter edits it; the bin deletes the meter together with its reading history. **Schedule by this meter** opens a new preventive schedule based on it.

## Recording readings

There are three ways to record a reading:

1. On the **Meters** page, type the value in the **Record** column and press the tick button.
2. On the asset's page, in the **Meters** box, the same way.
3. In a work order, through a checklist step of type **Meter reading**. When the work order's asset has exactly one meter with the same unit as the step, the step is linked to it, and the technician's answer is saved as a reading of that meter. See [Procedures](/help/procedures).

Decimals can be typed with a comma or a point. After saving, a short message confirms **Saved**, or **Saved — out of range**, and says if work orders were created.

> Readings taken in a work order's checklist are the easiest to keep up to date: add a **Meter reading** step to the procedure used by the regular visit, and the meter fills itself in as the work is done.

## Out-of-range alerts

When a reading is out of range and the meter has **Open a work order when a reading is out of range** ticked:

- The app opens a **Corrective** work order with **High** priority on the asset. Its title names the asset, the meter and the value, and its description shows the limits.
- Everyone who can manage work orders receives a notification. See [Notifications](/help/notifications).
- Only one alert work order is open per meter at a time. Further out-of-range readings don't open new ones while it is still open; once it is done or cancelled, the next out-of-range reading opens a new one.

Without the tick, the value is still shown in red with the warning triangle, but no work order is created.

## Meter-based preventive schedules

A preventive schedule set to **By meter reading** watches one meter. When the meter has advanced by the schedule's interval since its last work order, the next reading creates a preventive work order. A reading lower than before (the meter was reset or replaced) simply restarts the count. On the preventive list, these schedules show how many units are left before the next one.

## Who can do what

- **Super Admin**, **Administrator**, **Manager** and **Technician** can add, edit and delete meters (as part of managing assets) and record readings.
- **Super Admin**, **Administrator** and **Manager** can create schedules from a meter.
- **Viewer** and **Accountant** can see meters and their trends, but not record readings.
`,
  pt: `# Contadores

Valores que acompanha num equipamento ao longo do tempo, como a carga da bateria da UPS, horas de disco ou horas da lâmpada do projetor. Leituras fora dos limites podem abrir uma ordem de trabalho, e os contadores podem comandar planos preventivos.

## Para que servem os contadores

Um contador pertence a um equipamento e regista um número com uma unidade: uma percentagem, horas, graus. Cada leitura fica guardada, por isso pode ver a tendência e detetar uma bateria ou um disco que se está a degradar antes de avariar. Os contadores fazem ainda mais duas coisas:

- **Alertas**: quando uma leitura está abaixo do mínimo ou acima do máximo, a aplicação pode abrir uma ordem de trabalho sozinha.
- **Manutenção por contador**: um plano preventivo pode criar uma ordem de trabalho a cada tantas unidades, por exemplo a cada 500 horas de lâmpada. Veja [Manutenção preventiva](/help/preventive).

## O ecrã principal

**Contadores** no menu lista todos os contadores da empresa, agrupados por moradia e equipamento.

- **Nome**, com a moradia e o equipamento por baixo (clique para abrir o equipamento). Um triângulo de aviso indica que a última leitura está fora dos limites.
- **Tendência**: um pequeno gráfico das últimas 20 leituras, com os limites.
- **Última leitura**: o valor, a vermelho quando está fora dos limites, e há quanto tempo foi registado.
- **Registar**: uma caixa para escrever uma nova leitura.

Filtre por moradia, escolha **Só fora dos limites** para ver apenas os contadores que precisam de atenção, ou pesquise pelo nome do contador ou do equipamento.

![A lista de contadores, com a tendência e a última leitura de cada um](meters-list)

## Adicionar um contador

Os contadores criam-se no equipamento que medem.

1. Abra o equipamento (veja [Equipamentos](/help/assets)) e procure a caixa **Contadores**.
2. Clique em **Adicionar contador**.
3. Preencha o **Nome** (por exemplo "Carga da bateria") e a **Unidade** (por exemplo %, h ou °C).
4. Opcionalmente, defina um **Mínimo** e um **Máximo**. Uma leitura abaixo do mínimo ou acima do máximo está fora dos limites. Pode definir só um deles; o mínimo tem de ser inferior ao máximo.
5. Deixe marcado **Abrir uma ordem de trabalho quando uma leitura estiver fora dos limites** se um valor fora dos limites deve criar um trabalho.
6. Clique em **Adicionar**.

O lápis ao lado de um contador edita-o; o caixote do lixo elimina o contador e o histórico de leituras. **Planear por este contador** abre um novo plano preventivo baseado nele.

## Registar leituras

Há três formas de registar uma leitura:

1. Na página **Contadores**, escreva o valor na coluna **Registar** e carregue no botão de visto.
2. Na página do equipamento, na caixa **Contadores**, da mesma forma.
3. Numa ordem de trabalho, através de um passo da checklist do tipo **Leitura de contador**. Quando o equipamento da ordem tem exatamente um contador com a mesma unidade do passo, o passo fica ligado a ele e a resposta do técnico é guardada como leitura desse contador. Veja [Procedimentos](/help/procedures).

As casas decimais podem ser escritas com vírgula ou ponto. Depois de guardar, uma mensagem curta confirma **Guardado**, ou **Guardado — fora dos limites**, e indica se foram criadas ordens de trabalho.

> As leituras feitas na checklist de uma ordem de trabalho são as mais fáceis de manter em dia: acrescente um passo **Leitura de contador** ao procedimento da visita regular, e o contador preenche-se à medida que o trabalho é feito.

## Alertas fora dos limites

Quando uma leitura está fora dos limites e o contador tem marcado **Abrir uma ordem de trabalho quando uma leitura estiver fora dos limites**:

- A aplicação abre uma ordem de trabalho **Corretiva** com prioridade **Alta** no equipamento. O título indica o equipamento, o contador e o valor, e a descrição mostra os limites.
- Todas as pessoas que podem gerir ordens de trabalho recebem uma notificação. Veja [Notificações](/help/notifications).
- Só há uma ordem de alerta aberta por contador de cada vez. Novas leituras fora dos limites não abrem outras enquanto essa estiver aberta; depois de concluída ou cancelada, a leitura seguinte fora dos limites abre uma nova.

Sem essa opção, o valor continua a aparecer a vermelho com o triângulo de aviso, mas não é criada nenhuma ordem de trabalho.

## Planos preventivos por contador

Um plano preventivo definido **Por leitura de contador** acompanha um contador. Quando o contador avançou o intervalo do plano desde a última ordem, a leitura seguinte cria uma ordem de trabalho preventiva. Uma leitura inferior à anterior (o contador foi reposto ou substituído) recomeça simplesmente a contagem. Na lista de planos preventivos, estes planos mostram quantas unidades faltam para a próxima ordem.

## Quem pode fazer o quê

- **Super Admin**, **Administrador**, **Gestor** e **Técnico** podem adicionar, editar e eliminar contadores (no âmbito da gestão de equipamentos) e registar leituras.
- **Super Admin**, **Administrador** e **Gestor** podem criar planos a partir de um contador.
- **Observador** e **Contabilista** veem os contadores e as tendências, mas não registam leituras.
`,
};

export default text;
