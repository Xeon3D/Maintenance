import type { HelpShot, HelpText } from "@/lib/help";

export const shots: HelpShot[] = [{ name: "users-page", path: "/settings/users", maxHeight: 720 }];

const text: HelpText = {
  en: `# Users

Invite people to your company, choose their role, and deactivate or erase them when they leave. Client portal users are invited here too.

## What this page is for

**Users** (under **Settings** in the menu) lists everyone who can sign in to this company: your staff and your clients' portal users. From here you invite new people, decide what each one can do by giving them a role, and remove access when someone leaves.

![The Users page: the invitation form at the top and the list of people below](users-page)

The page has three parts:

- **Invite user**: the form for new invitations.
- **The list of people**, with their **Name** and e-mail, **Role** (and, for client users, the client they belong to), **Price per hour**, **Status** and **Actions**.
- **Pending invitations**: invitations not accepted yet, shown only when there are any.

## Inviting someone

1. In **Invite user**, type the person's **Email**.
2. Choose a **Role**. The built-in roles come first; your own roles appear under **Custom roles**.
3. Click **Create invitation**.

The person receives an e-mail with a link to join (in the language you are using). The link is also shown on the page, with a **Copy** button, so you can send it another way, for example by WhatsApp. It expires in 7 days.

When they open the link, they either sign in, if they already have an account with that e-mail address, or create their account, and then click **Accept invitation**. They appear in the list straight away.

> The invitation only works for the e-mail address it was sent to. If the person is signed in with a different account, they are asked to sign out and sign in with the right one. An invitation can also be accepted by someone who already works for another company on this server: they then switch between companies from the top of the menu.

## Client portal users

To give a client access to the client portal, invite them with the **Client (requester)** role. A **Client** field then appears: choose which client they belong to. Client users only see requests and work orders for that client's villas, and never the staff app. See [Requests](/help/requests) for what they can do there.

## Pending invitations

The **Pending invitations** table shows each open invitation with its e-mail, role and when it expires. Click **Revoke** to cancel one, for example if it was sent to the wrong address. To send a fresh link, simply create a new invitation.

## Changing someone's role

Pick a new role in the drop-down in the person's row. The change is saved straight away and applies the next time they open a page. The role decides what they can see and do (see [Roles](/help/roles)) and, for staff, the **Price per hour** charged for their time on jobs.

> Only people whose role can carry out work orders can be assigned work orders. If someone is missing from the assignee list, check their role.

## Deactivating and erasing

When someone leaves, click **Deactivate** in their row. They can no longer open this company, but everything they did stays: work orders, time entries, comments and signatures keep their name. **Reactivate** gives the access back.

Once a person is deactivated, an **Erase data** button appears. It removes their name, e-mail, phone, password and notifications for good, so they can no longer sign in. Their jobs and time stay, under "Former user". Use it when someone asks for their personal data to be deleted.

> Erasing can't be undone. If the person also belongs to another company on this server, their account can't be erased from here: deactivating them removes their access to your company.

## What you can't change

- The Super Admin's row has no controls: the Super Admin's role can't be changed and they can't be deactivated.
- You can't change your own role or deactivate yourself, so a company can never be left without someone to manage it.
- Erased people stay in the list, marked **Erased**, with no controls.

## Who can access it

Roles with the **Users and roles** permission, by default the Super Admin and Administrators. To group technicians by specialty, use [Teams](/help/teams).
`,
  pt: `# Utilizadores

Convide pessoas para a sua empresa, escolha a função de cada uma e desative-as ou apague os seus dados quando saírem. Os utilizadores do portal do cliente também são convidados aqui.

## Para que serve esta página

**Utilizadores** (em **Definições** no menu) mostra todas as pessoas que podem entrar nesta empresa: os seus colaboradores e os utilizadores do portal dos seus clientes. Aqui convida novas pessoas, decide o que cada uma pode fazer atribuindo-lhe uma função e retira o acesso quando alguém sai.

![A página Utilizadores: o formulário de convite no topo e a lista de pessoas por baixo](users-page)

A página tem três partes:

- **Convidar utilizador**: o formulário para novos convites.
- **A lista de pessoas**, com o **Nome** e e-mail, a **Função** (e, nos utilizadores de cliente, o cliente a que pertencem), o **Preço por hora**, o **Estado** e as **Ações**.
- **Convites pendentes**: convites ainda não aceites, só aparece quando existem.

## Convidar uma pessoa

1. Em **Convidar utilizador**, escreva o **Email** da pessoa.
2. Escolha uma **Função**. Primeiro aparecem as funções base; as suas próprias funções aparecem em **Funções personalizadas**.
3. Clique em **Criar convite**.

A pessoa recebe um e-mail com uma ligação para entrar (no idioma que está a usar). A ligação também aparece na página, com um botão **Copiar**, para a poder enviar de outra forma, por exemplo por WhatsApp. Expira dentro de 7 dias.

Ao abrir a ligação, a pessoa inicia sessão, se já tiver uma conta com esse endereço de e-mail, ou cria a sua conta, e depois clica em **Aceitar convite**. Passa logo a aparecer na lista.

> O convite só funciona para o endereço de e-mail para onde foi enviado. Se a pessoa tiver sessão iniciada com outra conta, é-lhe pedido que termine a sessão e entre com a conta certa. Um convite também pode ser aceite por alguém que já trabalha para outra empresa neste servidor: passa a mudar de empresa no topo do menu.

## Utilizadores do portal do cliente

Para dar a um cliente acesso ao portal do cliente, convide-o com a função **Cliente (requerente)**. Aparece então o campo **Cliente**: escolha a que cliente pertence. Os utilizadores de cliente só veem pedidos e ordens de trabalho das moradias desse cliente, e nunca a aplicação da equipa. Veja em [Pedidos](/help/requests) o que podem fazer.

## Convites pendentes

A tabela **Convites pendentes** mostra cada convite em aberto, com o e-mail, a função e quando expira. Clique em **Revogar** para cancelar um convite, por exemplo se foi enviado para o endereço errado. Para enviar uma nova ligação, basta criar um novo convite.

## Mudar a função de uma pessoa

Escolha a nova função na lista na linha da pessoa. A alteração fica guardada de imediato e aplica-se na próxima página que a pessoa abrir. A função decide o que a pessoa pode ver e fazer (veja [Funções](/help/roles)) e, para os colaboradores, o **Preço por hora** cobrado pelo tempo registado nos trabalhos.

> Só as pessoas cuja função pode executar ordens de trabalho podem ter ordens de trabalho atribuídas. Se alguém não aparece na lista de responsáveis, verifique a sua função.

## Desativar e apagar dados

Quando alguém sai, clique em **Desativar** na sua linha. A pessoa deixa de poder abrir esta empresa, mas tudo o que fez fica: ordens de trabalho, registos de tempo, comentários e assinaturas mantêm o seu nome. **Reativar** devolve-lhe o acesso.

Depois de a pessoa estar desativada, aparece o botão **Apagar dados**. Remove definitivamente o nome, e-mail, telefone, palavra-passe e notificações, e a pessoa deixa de poder iniciar sessão. Os trabalhos e o tempo ficam, como "Antigo utilizador". Use-o quando alguém pede que os seus dados pessoais sejam apagados.

> Apagar os dados não pode ser desfeito. Se a pessoa pertencer também a outra empresa neste servidor, a conta não pode ser apagada aqui: desativá-la remove o acesso à sua empresa.

## O que não pode alterar

- A linha do Super Admin não tem controlos: a função do Super Admin não pode ser alterada e não pode ser desativado.
- Não pode mudar a sua própria função nem desativar-se a si mesmo, para que a empresa nunca fique sem ninguém para a gerir.
- As pessoas com dados apagados ficam na lista, marcadas como **Apagado**, sem controlos.

## Quem pode aceder

As funções com a permissão **Utilizadores e funções**, por defeito o Super Admin e os Administradores. Para agrupar técnicos por especialidade, use as [Equipas](/help/teams).
`,
};

export default text;
