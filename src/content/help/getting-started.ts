import type { HelpShot, HelpText } from "@/lib/help";

export const shots: HelpShot[] = [{ name: "getting-started-shell", path: "/dashboard", selector: "body", maxHeight: 720 }];

const text: HelpText = {
  en: `# Getting started

How the app is organised, what you see depending on your role, and the few things that work the same on every page.

## How the app is organised

Everything starts from the menu on the left (on a phone, open it with the menu button at the top). The menu only shows the areas your role can use, so two colleagues may see different menus.

![The menu on the left, with the company at the top and your name at the bottom](getting-started-shell)

- **Dashboard**, **Field app (offline)** and **Scan**: your starting point, the offline app for the field and the QR / barcode reader.
- **Operations**: work orders, requests from clients, preventive maintenance, procedures (checklists) and messages.
- **Sites & assets**: clients, maintenance contracts, villas, the equipment installed in them and meters.
- **Supply**: parts and stock, purchase orders and vendors.
- **Insights**: reports and exports.
- **Settings**: your profile and, for administrators, the company, users, roles, teams, categories, the audit log and the server.

## How the pieces fit together

The app follows the way a villa is looked after:

1. A **client** owns (or manages) one or more **villas**. A villa is split into **areas** (rooms, technical rooms, outside) and holds **assets**: the installed equipment, such as a KNX controller, a switch, a camera or a UPS.
2. Work is done through **work orders**. A work order says what has to be done, where, by whom and by when; the technician records checklist answers, photos, time, parts and the client's signature.
3. Work orders come from three places: created by hand, approved **requests** from clients, or generated automatically by **preventive maintenance** schedules and **meter** alerts.
4. A **maintenance contract** sets the response and resolution times (SLA) and the visits a client pays for. Work orders at the client's villas are linked to it automatically.
5. **Parts** used on a job come out of a stock location (the warehouse or a technician's van); **purchase orders** to **vendors** put them back.
6. **Reports** add it all up: workload, SLA compliance, billing, technicians and assets.

## Roles: who can do what

Each person has a role in the company. The usual defaults are:

- **Super Admin**: everything, including changing what other roles can do.
- **Administrator**: everything except billing: settings, users and approvals.
- **Manager**: plans and assigns work, manages clients, contracts, stock and purchasing.
- **Technician**: carries out work orders, records time and parts, edits assets.
- **Accountant**: reports and billing.
- **Viewer**: can look at everything internal but not change it.
- **Client (requester)**: only sees the client portal: their villas, their requests and the jobs shared with them.

> The Super Admin can change these permissions, and create roles, in [Settings → Roles](/help/roles). If a button or menu entry described in this help is missing for you, your role doesn't include it.

## Things that work the same everywhere

- **Lists** have a search box and filters at the top. The filters are part of the page address, so you can bookmark or share a filtered list.
- **Archive** hides a record from the lists without deleting its history. Archived records can be shown with a filter and restored.
- **Dates** are always day/month/year and times are 24-hour, in the company's time zone.
- **Language and theme**: switch between English and Português, and between light, dark and automatic theme, in your [Profile](/help/profile) (click your name at the bottom of the menu). The choice is remembered for your account.
- **Notifications**: the bell next to your name shows what needs your attention. See [Notifications](/help/notifications).
- **Help**: the round **?** button in the bottom-right corner of every page opens the help for the page you're on.

## More than one company

If you belong to more than one company, click the company name at the top of the menu to switch. Each company has its own clients, villas, work orders and settings; nothing is shared between them.
`,
  pt: `# Primeiros passos

Como a aplicação está organizada, o que vê consoante a sua função e o que funciona da mesma forma em todas as páginas.

## Como a aplicação está organizada

Tudo começa no menu à esquerda (no telemóvel, abra-o com o botão de menu no topo). O menu só mostra as áreas que a sua função pode usar, por isso dois colegas podem ver menus diferentes.

![O menu à esquerda, com a empresa no topo e o seu nome em baixo](getting-started-shell)

- **Painel**, **App de campo (offline)** e **Ler código**: o seu ponto de partida, a aplicação offline para o terreno e o leitor de QR / códigos de barras.
- **Operações**: ordens de trabalho, pedidos dos clientes, manutenção preventiva, procedimentos (listas de verificação) e mensagens.
- **Locais e equipamentos**: clientes, contratos de manutenção, moradias, os equipamentos nelas instalados e contadores.
- **Aprovisionamento**: peças e stock, encomendas e fornecedores.
- **Análise**: relatórios e exportações.
- **Definições**: o seu perfil e, para administradores, a empresa, utilizadores, funções, equipas, categorias, o registo de auditoria e o servidor.

## Como as peças se ligam

A aplicação segue a forma como se cuida de uma moradia:

1. Um **cliente** é dono (ou gestor) de uma ou mais **moradias**. Uma moradia divide-se em **pisos e divisões** (salas, salas técnicas, exterior) e tem **equipamentos**: o que está instalado, como um controlador KNX, um switch, uma câmara ou uma UPS.
2. O trabalho faz-se através de **ordens de trabalho**. Uma ordem de trabalho diz o que há a fazer, onde, por quem e até quando; o técnico regista as respostas da lista de verificação, fotografias, tempo, peças e a assinatura do cliente.
3. As ordens de trabalho têm três origens: criadas à mão, **pedidos** de clientes aprovados, ou geradas automaticamente por planos de **manutenção preventiva** e alertas de **contadores**.
4. Um **contrato de manutenção** define os tempos de resposta e de resolução (SLA) e as visitas que o cliente paga. As ordens de trabalho nas moradias do cliente ficam ligadas a ele automaticamente.
5. As **peças** usadas num trabalho saem de um local de stock (o armazém ou a carrinha de um técnico); as **encomendas** a **fornecedores** repõem-nas.
6. Os **relatórios** juntam tudo: volume de trabalho, cumprimento de SLA, faturação, técnicos e equipamentos.

## Funções: quem pode fazer o quê

Cada pessoa tem uma função na empresa. Por defeito:

- **Super Admin**: tudo, incluindo alterar o que as outras funções podem fazer.
- **Administrador**: tudo exceto a faturação: definições, utilizadores e aprovações.
- **Gestor**: planeia e atribui trabalho, gere clientes, contratos, stock e compras.
- **Técnico**: executa ordens de trabalho, regista tempo e peças, edita equipamentos.
- **Contabilista**: relatórios e faturação.
- **Observador**: vê toda a informação interna, mas não a altera.
- **Cliente (requerente)**: só vê o portal do cliente: as suas moradias, os seus pedidos e os trabalhos partilhados com ele.

> O Super Admin pode alterar estas permissões, e criar funções, em [Definições → Funções](/help/roles). Se lhe faltar um botão ou entrada de menu descritos nesta ajuda, a sua função não o inclui.

## O que funciona igual em todo o lado

- As **listas** têm uma caixa de pesquisa e filtros no topo. Os filtros fazem parte do endereço da página, por isso pode guardar ou partilhar uma lista filtrada.
- **Arquivar** esconde um registo das listas sem apagar o seu histórico. Os registos arquivados podem ser mostrados com um filtro e restaurados.
- As **datas** são sempre dia/mês/ano e as horas em formato de 24 horas, no fuso horário da empresa.
- **Idioma e tema**: mude entre English e Português, e entre tema claro, escuro e automático, no seu [Perfil](/help/profile) (clique no seu nome no fundo do menu). A escolha fica guardada na sua conta.
- **Notificações**: o sino junto ao seu nome mostra o que precisa da sua atenção. Veja [Notificações](/help/notifications).
- **Ajuda**: o botão redondo **?** no canto inferior direito de cada página abre a ajuda da página em que está.

## Mais do que uma empresa

Se pertence a mais do que uma empresa, clique no nome da empresa no topo do menu para mudar. Cada empresa tem os seus próprios clientes, moradias, ordens de trabalho e definições; nada é partilhado entre elas.
`,
};

export default text;
