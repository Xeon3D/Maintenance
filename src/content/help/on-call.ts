import type { HelpShot, HelpText } from "@/lib/help";

export const shots: HelpShot[] = [];

const text: HelpText = {
  en: `# On call

Take turns being on call, one person per week. Whoever is on call receives every new client request, so nothing waits for the office to open.

## How it works

Weeks run from Monday to Sunday, in the company's time zone. Each week can be given to one member of the **on-call team**.

When a client sends a request, from the client portal or by scanning a QR label, the person on call at that moment:

- gets the **New request** notification, in the app, by e-mail and by push, as set in their profile;
- can **approve or decline** that request, even if their role normally can't, and is pre-selected as the assignee when approving it;
- is shown on the request as **On call when it arrived**, and next to it in the requests list.

The people who approve requests keep receiving them as before. When nobody is on call, only they do. See [Requests](/help/requests).

## The on-call screen

Open **On call** in the sidebar. At the top is who is on call this week. Below it, the month's calendar has one row per week, with the week number, its days and the person on call; the current week is highlighted and today is circled. The arrows move between months, and **This month** comes back. This screen is for viewing only: everyone on the staff sees it, and nothing can be changed there.

The team and the weeks are changed on a copy of the same screen, opened with the **On call** button at the top of **Settings → Staff** (see [Staff](/help/users)), for those allowed to manage it.

## Choosing the on-call team

In **Settings → Staff → On call**, **On-call team** lists the active staff. Tick the people who can be on call; each gets a colour, used on their weeks in the calendar.

Clients and viewers can't be in the team. Removing someone from the team frees their weeks from the current one on; past weeks stay as a record.

## Giving out the weeks

In the calendar of **Settings → Staff → On call**, choose a person in the **On call** column of each week. The change is saved at once. Choose **Nobody** to free a week.

> Plan a few months ahead: move to the next months with the arrow and fill in each week.

## Who can do what

- **Super Admin** and **Administrator** choose the team and give out the weeks (the **Manage on call** permission in [Roles](/help/roles), which can be given to other roles).
- Everyone on the staff sees the calendar in **On call** on the sidebar.
`,
  pt: `# Prevenção

Façam turnos de prevenção, uma pessoa por semana. Quem está de prevenção recebe todos os novos pedidos dos clientes, para que nada fique à espera da abertura do escritório.

## Como funciona

As semanas vão de segunda a domingo, no fuso horário da empresa. Cada semana pode ser atribuída a um membro da **equipa de prevenção**.

Quando um cliente envia um pedido, a partir do portal do cliente ou ao digitalizar uma etiqueta QR, quem está de prevenção nesse momento:

- recebe a notificação **Novo pedido**, na aplicação, por e-mail e por push, conforme o seu perfil;
- pode **aprovar ou recusar** esse pedido, mesmo que a sua função normalmente não o permita, e fica pré-selecionado como responsável ao aprová-lo;
- aparece no pedido como **De prevenção quando chegou**, e ao lado dele na lista de pedidos.

Quem aprova pedidos continua a recebê-los como antes. Quando ninguém está de prevenção, só essas pessoas os recebem. Veja [Pedidos](/help/requests).

## O ecrã Prevenção

Abra **Prevenção** na barra lateral. No topo está quem está de prevenção esta semana. Por baixo, o calendário do mês tem uma linha por semana, com o número da semana, os seus dias e quem está de prevenção; a semana atual está destacada e o dia de hoje assinalado. As setas mudam de mês e **Este mês** volta ao atual. Este ecrã é só de consulta: todos os colaboradores o veem e nada pode ser alterado aí.

A equipa e as semanas alteram-se numa cópia do mesmo ecrã, aberta com o botão **Prevenção** no topo de **Definições → Colaboradores** (veja [Colaboradores](/help/users)), por quem tem permissão para a gerir.

## Escolher a equipa de prevenção

Em **Definições → Colaboradores → Prevenção**, **Equipa de prevenção** lista os membros ativos da empresa. Marque quem pode estar de prevenção; cada pessoa recebe uma cor, usada nas suas semanas no calendário.

Clientes e observadores não podem fazer parte da equipa. Retirar alguém da equipa liberta as suas semanas a partir da atual; as semanas passadas ficam como registo.

## Atribuir as semanas

No calendário de **Definições → Colaboradores → Prevenção**, escolha uma pessoa na coluna **De prevenção** de cada semana. A alteração fica guardada de imediato. Escolha **Ninguém** para libertar uma semana.

> Planeie alguns meses à frente: avance para os meses seguintes com a seta e preencha cada semana.

## Quem pode fazer o quê

- **Super Admin** e **Administrador** escolhem a equipa e atribuem as semanas (a permissão **Gerir prevenção** em [Funções](/help/roles), que pode ser dada a outras funções).
- Todos os colaboradores veem o calendário em **Prevenção** na barra lateral.
`,
};

export default text;
