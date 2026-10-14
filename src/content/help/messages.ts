import type { HelpShot, HelpText } from "@/lib/help";

export const shots: HelpShot[] = [{ name: "messages-new", path: "/messages/new" }];

const text: HelpText = {
  en: `# Messages

Chat with your colleagues inside the app: direct messages between two people, group chats, and a channel for each team. Type @ to mention someone and make sure they see it.

## What Messages is for

**Messages** is for quick conversations inside the company: asking the office for a code, telling the team a van is free, coordinating a visit. There are three kinds of conversation:

- **Direct messages**: between you and one colleague. There's only ever one per pair of people, so starting a new one with the same person reopens the existing conversation.
- **Groups**: several people, optionally with a name. You choose who's in it when you create it.
- **Team channels**: one per team, created automatically. Everyone currently in the team can read and write in it; people who join the team later see the whole history, and people who leave the team lose access. Team membership is managed in [Teams](/help/teams).

> Talk about a specific job in the work order's own **Activity** comments instead, so the conversation stays with the job and appears in its history. See [Work orders](/help/work-orders).

## The conversation list

On the left, **Conversations** lists every conversation you're part of, the most recently active first. Each row shows:

- an icon for the kind of conversation: a # for a team channel (in the team's colour), several people for a group, one person for a direct message;
- its name: the team, the group name, or the other people's names;
- the last message, with who wrote it, and when (the time for today, otherwise the date).

Conversations with messages you haven't read are in bold, with a dot on the right. The number next to **Messages** in the menu counts them.

## Starting a conversation

![Starting a new conversation: tick one person for a direct message, or several for a group](messages-new)

1. Click **New message** at the top of the conversation list.
2. Under **People**, tick one person for a direct message, or several for a group chat. Each person's role is shown next to their name.
3. Optionally, type a **Group name**. Giving a name always creates a group, even with one person.
4. Click **Start conversation**.

You don't need to create team channels: they appear in the list by themselves for every team you're in.

## Writing messages

1. Open a conversation from the list. The header shows its name and, for groups and team channels, who's in it.
2. Type in the box at the bottom (**Write a message… (@ to mention)**).
3. Press Enter to send. Press Shift+Enter for a new line without sending.

New messages appear by themselves every few seconds while the page is open, and the conversation is marked as read as you see them. Only the latest 200 messages of a conversation are shown.

> Messages are plain text. You can't attach photos or files, or edit or delete a message once it's sent, so check before pressing Enter.

## Mentioning someone

Type @ followed by the start of a name and pick the person from the suggestions. In a group or team channel, the people you mention get a **mentioned you** notification under the bell (and by email, unless they've turned that off), so they notice it even in a busy conversation. Writing just a first name works when only one person in the conversation has it.

Everyone else in the conversation gets a push alert for each new message, if they've turned push on. Plain messages don't appear under the bell; the unread count next to **Messages** shows them instead. See [Notifications](/help/notifications) to change what reaches you.

## Leaving a group

Open the group and click the leave button at the top right (**Leave group**), then confirm. You'll stop seeing the group and its new messages. Nobody can add people to an existing group, so if you need to come back, someone has to start a new one with you.

Direct messages can't be left, and you leave a team channel only by leaving the team.

## Who can use it

Everyone who works in the company can use **Messages**: Super Admin, Administrators, Managers, Technicians, Viewers and Accountants. You can only see the conversations you're part of; not even the Super Admin can read other people's direct messages or groups. Clients have no access to chat: they talk to you through [Requests](/help/requests) in the client portal.
`,
  pt: `# Mensagens

Converse com os seus colegas dentro da aplicação: mensagens diretas entre duas pessoas, conversas de grupo e um canal para cada equipa. Escreva @ para mencionar alguém e garantir que vê a mensagem.

## Para que servem as mensagens

**Mensagens** serve para conversas rápidas dentro da empresa: pedir um código ao escritório, avisar a equipa de que uma carrinha está livre, combinar uma visita. Há três tipos de conversa:

- **Mensagens diretas**: entre si e um colega. Há sempre só uma por par de pessoas, por isso iniciar uma nova com a mesma pessoa reabre a conversa existente.
- **Grupos**: várias pessoas, com ou sem nome. Escolhe quem participa quando o cria.
- **Canais de equipa**: um por equipa, criado automaticamente. Todos os membros atuais da equipa podem ler e escrever; quem entra na equipa mais tarde vê todo o histórico, e quem sai deixa de ter acesso. A composição das equipas gere-se em [Equipas](/help/teams).

> Fale sobre um trabalho concreto nos comentários de **Atividade** da própria ordem de trabalho, para que a conversa fique com o trabalho e apareça no seu histórico. Veja [Ordens de trabalho](/help/work-orders).

## A lista de conversas

À esquerda, **Conversas** mostra todas as conversas em que participa, primeiro as com atividade mais recente. Cada linha mostra:

- um ícone com o tipo de conversa: um # para um canal de equipa (na cor da equipa), várias pessoas para um grupo, uma pessoa para uma mensagem direta;
- o nome: a equipa, o nome do grupo ou os nomes das outras pessoas;
- a última mensagem, com quem a escreveu, e quando (a hora se for de hoje, senão a data).

As conversas com mensagens por ler aparecem a negrito, com um ponto à direita. O número junto a **Mensagens** no menu conta-as.

## Iniciar uma conversa

![Iniciar uma nova conversa: marque uma pessoa para uma mensagem direta, ou várias para um grupo](messages-new)

1. Clique em **Nova mensagem** no topo da lista de conversas.
2. Em **Pessoas**, marque uma pessoa para uma mensagem direta, ou várias para uma conversa de grupo. A função de cada pessoa aparece junto ao nome.
3. Se quiser, escreva um **Nome do grupo**. Com um nome é sempre criado um grupo, mesmo só com uma pessoa.
4. Clique em **Iniciar conversa**.

Não precisa de criar os canais de equipa: aparecem sozinhos na lista para cada equipa a que pertence.

## Escrever mensagens

1. Abra uma conversa na lista. O cabeçalho mostra o nome e, nos grupos e canais de equipa, quem participa.
2. Escreva na caixa em baixo (**Escreva uma mensagem… (@ para mencionar)**).
3. Prima Enter para enviar. Prima Shift+Enter para mudar de linha sem enviar.

As novas mensagens aparecem sozinhas a cada poucos segundos enquanto a página está aberta, e a conversa é marcada como lida à medida que as vê. Só são mostradas as últimas 200 mensagens de cada conversa.

> As mensagens são só texto. Não é possível anexar fotografias ou ficheiros, nem editar ou apagar uma mensagem depois de enviada, por isso confirme antes de premir Enter.

## Mencionar alguém

Escreva @ seguido do início de um nome e escolha a pessoa nas sugestões. Num grupo ou canal de equipa, as pessoas mencionadas recebem uma notificação **fez uma menção a si** no sino (e por email, a não ser que o tenham desligado), para que reparem mesmo numa conversa movimentada. Basta o primeiro nome quando só uma pessoa da conversa o tem.

Todos os outros participantes recebem um alerta push por cada nova mensagem, se tiverem o push ativo. As mensagens normais não aparecem no sino; o número de conversas por ler junto a **Mensagens** mostra-as. Veja [Notificações](/help/notifications) para alterar o que lhe chega.

## Sair de um grupo

Abra o grupo e clique no botão de saída no canto superior direito (**Sair do grupo**) e confirme. Deixa de ver o grupo e as suas novas mensagens. Ninguém pode adicionar pessoas a um grupo existente, por isso, se precisar de voltar, alguém tem de iniciar um novo grupo consigo.

Não é possível sair de uma mensagem direta, e só sai de um canal de equipa saindo da equipa.

## Quem pode usar

Todas as pessoas que trabalham na empresa podem usar **Mensagens**: Super Admin, Administradores, Gestores, Técnicos, Observadores e Contabilistas. Só vê as conversas em que participa; nem o Super Admin consegue ler as mensagens diretas ou os grupos dos outros. Os clientes não têm acesso às mensagens: falam consigo através dos [Pedidos](/help/requests) no portal do cliente.
`,
};

export default text;
