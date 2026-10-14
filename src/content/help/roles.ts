import type { HelpShot, HelpText } from "@/lib/help";

export const shots: HelpShot[] = [
  { name: "roles-rates", path: "/settings/roles", selector: "main .max-w-5xl > :first-child", maxHeight: 620 },
  { name: "roles-permissions", path: "/settings/roles", selector: "main .max-w-5xl > :last-child", maxHeight: 1100 },
];

const text: HelpText = {
  en: `# Roles

What each role can do and what an hour of its time is charged at. Set the prices per hour of the built-in roles, create your own roles such as Engineer or Electrician, and, as Super Admin, adjust the permissions of every role.

## What this page is for

Everyone in the company has a role. The role decides two things:

- **What the person can see and do**: which menus they get, which buttons appear, what they may change.
- **What their time is charged at**: the price per hour billed to the client for the time they log on work orders.

**Roles** (under **Settings** in the menu) has three cards: **Built-in roles**, **Custom roles** and **Permissions**. Roles are given to people in [Users](/help/users).

## The built-in roles

- **Super Admin**: everything, always. The only role that can change what the others may do. It can't be given to anyone from Users: it is usually the person who created the company.
- **Administrator**: by default everything except billing: settings, users, approvals.
- **Manager**: by default plans and assigns work, manages clients, stock and purchasing.
- **Technician**: by default does the work: work orders, checklists, time, parts.
- **Viewer**: by default an observer: sees everything, changes nothing.
- **Accountant**: by default reports, amounts and billing; no field work.
- **Client (requester)**: the client portal only: their villas and requests.

## Price per hour of the built-in roles

![Built-in roles with their price per hour](roles-rates)

1. In **Built-in roles**, type the **Price per hour** next to Super Admin, Administrator, Manager and Technician, in the company's currency.
2. Click **Save**.

Leave a price empty if you don't charge for that role's time. Viewer, Accountant and Client (requester) show **Not charged (doesn't log time)**: they don't record time on jobs.

## Custom roles

Custom roles are your own job titles, each with its own price per hour. A custom role doesn't invent new permissions: it starts with the access of one of the built-in roles.

To create one:

1. Under **New role**, type a **Name** (for example Engineer).
2. Choose its **Access**: **Same access as** Administrator, Manager or Technician.
3. Type its **Price per hour**, or leave it empty.
4. Click **Create**.

Each existing custom role shows how many people are in it. Edit the name, access or price and click **Save**. If you change the access, everyone in the role gets the new access straight away.

To give someone a custom role, pick it in their row in [Users](/help/users), where custom roles are listed under **Custom roles**. **Delete** removes a custom role; the people in it keep the same access under the matching built-in role.

## How role prices become labour

When someone logs time on a work order, the app stores the time together with that person's price per hour at that moment:

- the custom role's price, if they have a custom role with a price;
- otherwise the price of their built-in role.

Labour is the billed time multiplied by that stored price. Billed time is each technician's time on the work order rounded up to the company's blocks (30 minutes by default, see [Organization](/help/organization)), so 34 minutes at 40 per hour bill 40. It appears in a work order's amounts to bill, in requests and in the billing report (see [Reports](/help/reports)), for people allowed to **See amounts**.

> Price changes only apply to time logged from now on. Time already recorded keeps the price it was logged with, so changing a price never rewrites past amounts. The same is true when you move a person to another role.

## The permission matrix

The **Permissions** card is a table with one row per permission and one column per role: Super Admin, the built-in staff roles, your custom roles and Client (requester). The permissions are grouped into **Administration**, **Work**, **Clients, villas and assets**, **Stock and purchasing**, **Reports** and **Finance**, and each one has a short explanation under its name.

![The permission matrix: one column per role, one row per permission](roles-permissions)

The Super Admin column is marked **all, fixed** and the Client (requester) column **fixed**: they can't be changed. The first row, **Use the staff app**, is always on for staff roles.

To change what a role may do (Super Admin only):

1. Tick or untick the boxes in that role's column.
2. Click **Save**.

Changes apply straight away to everyone in the role. A role whose permissions differ from the defaults shows a **Changed** badge.

A custom role follows its access level until you change it here. For example, an Engineer role with **Same access as** Technician gains whatever you give Technicians, until you tick or untick a box in the Engineer column itself; from then on it keeps its own list.

**Restore defaults** puts every role, including custom roles, back to the default permissions.

> Be careful with the Administration permissions. **Company settings** gives access to the company profile and, with the server password, to the server. **Users and roles** lets a person invite people and change roles. **See access codes** shows villa codes and device passwords, and every view is logged.

## Who can access it

Roles with the **Users and roles** permission (by default the Super Admin and Administrators) can open this page, set prices per hour and manage custom roles. Only the Super Admin can change the permission matrix; everyone else sees it read-only, with the note **Only the Super Admin can change permissions.** Permission changes are recorded in the security log.
`,
  pt: `# Funções

O que cada função pode fazer e a que preço é cobrada uma hora do seu tempo. Defina o preço por hora das funções base, crie as suas próprias funções, como Engenharia ou Eletricista, e, como Super Admin, ajuste as permissões de todas as funções.

## Para que serve esta página

Cada pessoa na empresa tem uma função. A função decide duas coisas:

- **O que a pessoa pode ver e fazer**: que menus tem, que botões aparecem, o que pode alterar.
- **A que preço é cobrado o seu tempo**: o preço por hora faturado ao cliente pelo tempo que regista nas ordens de trabalho.

**Funções** (em **Definições** no menu) tem três cartões: **Funções base**, **Funções personalizadas** e **Permissões**. As funções são atribuídas às pessoas em [Utilizadores](/help/users).

## As funções base

- **Super Admin**: tudo, sempre. A única função que pode alterar o que as outras podem fazer. Não pode ser atribuída a ninguém em Utilizadores: normalmente é a pessoa que criou a empresa.
- **Administrador**: por defeito, tudo exceto a faturação: definições, utilizadores, aprovações.
- **Gestor**: por defeito, planeia e atribui trabalho, gere clientes, stock e compras.
- **Técnico**: por defeito, executa o trabalho: ordens de trabalho, listas de verificação, tempo, peças.
- **Observador**: por defeito, observação: vê tudo, não altera nada.
- **Contabilista**: por defeito, relatórios, valores e faturação; sem trabalho de campo.
- **Cliente (requerente)**: apenas o portal do cliente: as suas moradias e pedidos.

## Preço por hora das funções base

![Funções base com o preço por hora](roles-rates)

1. Em **Funções base**, escreva o **Preço por hora** junto a Super Admin, Administrador, Gestor e Técnico, na moeda da empresa.
2. Clique em **Guardar**.

Deixe o preço vazio se não cobra o tempo dessa função. Observador, Contabilista e Cliente (requerente) mostram **Não cobrado (não regista tempo)**: não registam tempo nos trabalhos.

## Funções personalizadas

As funções personalizadas são os seus próprios cargos, cada um com o seu preço por hora. Uma função personalizada não inventa permissões novas: começa com o acesso de uma das funções base.

Para criar uma:

1. Em **Nova função**, escreva um **Nome** (por exemplo Engenharia).
2. Escolha o **Acesso**: **Mesmo acesso que** Administrador, Gestor ou Técnico.
3. Escreva o **Preço por hora**, ou deixe-o vazio.
4. Clique em **Criar**.

Cada função personalizada existente mostra quantas pessoas tem. Altere o nome, o acesso ou o preço e clique em **Guardar**. Se mudar o acesso, todas as pessoas da função passam de imediato a ter o novo acesso.

Para dar uma função personalizada a alguém, escolha-a na linha da pessoa em [Utilizadores](/help/users), onde as funções personalizadas aparecem em **Funções personalizadas**. **Eliminar** remove uma função personalizada; as pessoas que a tinham mantêm o mesmo acesso com a função base correspondente.

## Como os preços das funções se tornam mão de obra

Quando alguém regista tempo numa ordem de trabalho, a aplicação guarda o tempo juntamente com o preço por hora dessa pessoa nesse momento:

- o preço da função personalizada, se tiver uma função personalizada com preço;
- caso contrário, o preço da sua função base.

A mão de obra é o tempo faturado multiplicado por esse preço guardado. O tempo faturado é o tempo de cada técnico na ordem de trabalho arredondado para cima aos blocos da empresa (30 minutos por defeito, veja [Empresa](/help/organization)), por isso 34 minutos a 40 por hora faturam 40. Aparece nos valores a faturar da ordem de trabalho, nos pedidos e no relatório de faturação (veja [Relatórios](/help/reports)), para quem tem permissão para **Ver valores**.

> As alterações de preço só se aplicam ao tempo registado a partir de agora. O tempo já registado mantém o preço com que foi registado, por isso mudar um preço nunca altera valores passados. O mesmo acontece quando muda uma pessoa de função.

## A tabela de permissões

O cartão **Permissões** é uma tabela com uma linha por permissão e uma coluna por função: Super Admin, as funções base da equipa, as suas funções personalizadas e Cliente (requerente). As permissões estão agrupadas em **Administração**, **Trabalho**, **Clientes, moradias e ativos**, **Stock e compras**, **Relatórios** e **Finanças**, e cada uma tem uma breve explicação por baixo do nome.

![A tabela de permissões: uma coluna por função, uma linha por permissão](roles-permissions)

A coluna do Super Admin está marcada como **tudo, fixo** e a do Cliente (requerente) como **fixo**: não podem ser alteradas. A primeira linha, **Usar a app da equipa**, está sempre ativa nas funções da equipa.

Para alterar o que uma função pode fazer (só o Super Admin):

1. Marque ou desmarque as caixas na coluna dessa função.
2. Clique em **Guardar**.

As alterações aplicam-se de imediato a todas as pessoas da função. Uma função cujas permissões diferem das predefinidas mostra a etiqueta **Alterada**.

Uma função personalizada segue o seu nível de acesso até a alterar aqui. Por exemplo, uma função Engenharia com **Mesmo acesso que** Técnico ganha o que der aos Técnicos, até marcar ou desmarcar uma caixa na própria coluna Engenharia; a partir daí mantém a sua própria lista.

**Repor as permissões por defeito** devolve todas as funções, incluindo as personalizadas, às permissões predefinidas.

> Tenha cuidado com as permissões de Administração. **Definições da empresa** dá acesso ao perfil da empresa e, com a palavra-passe do servidor, ao servidor. **Utilizadores e funções** permite convidar pessoas e mudar funções. **Ver códigos de acesso** mostra os códigos das moradias e as palavras-passe dos equipamentos, e cada consulta fica registada.

## Quem pode aceder

As funções com a permissão **Utilizadores e funções** (por defeito o Super Admin e os Administradores) podem abrir esta página, definir os preços por hora e gerir as funções personalizadas. Só o Super Admin pode alterar a tabela de permissões; os restantes veem-na apenas para consulta, com a nota **Só o Super Admin pode alterar as permissões.** As alterações de permissões ficam no registo de segurança.
`,
};

export default text;
