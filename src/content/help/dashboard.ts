import type { HelpShot, HelpText } from "@/lib/help";

export const shots: HelpShot[] = [{ name: "dashboard-overview", path: "/dashboard" }];

const text: HelpText = {
  en: `# Dashboard

Your starting page: a few counters that show what needs attention across the company, your own open work orders and the jobs that are already late.

## What the dashboard is for

The **Dashboard** is the first page you see after signing in. It doesn't replace the lists (work orders, requests, parts); it tells you where to look first. Every counter and every row is a link, so one click takes you to the filtered list behind it.

The figures are always live: they are worked out when the page opens, so reload the page (or come back to it) to see the latest numbers.

![The dashboard: counters at the top, your open work orders and the overdue ones below](dashboard-overview)

## Searching

The box at the top searches every work order and the notes technicians wrote on them. Type a word, press Enter, and the [Search](/help/search) page opens with the results.

## On call this week

Below the search, a card shows who is on call this week, the person who receives every new client request (or that nobody is). Click it to open the full calendar. See [On call](/help/on-call).

## The counters

The row of cards at the top counts things across the whole company, not only your own work. A number shown in red means something is wrong and needs action.

- **Open work orders**: every work order that is **Open**, **In progress** or **On hold**. Opens the work order list.
- **Overdue**: open work orders whose due date has passed. Shown in red when there is at least one; opens the work order list filtered to overdue jobs.
- **Pending requests**: requests from clients that nobody has accepted or declined yet. Opens [Requests](/help/requests).
- **Low-stock parts**: parts at or below their minimum quantity, either in total or in one stock location that has its own minimum. Shown in red when there is at least one; opens the parts list filtered to low stock. See [Parts & inventory](/help/parts).
- **POs to approve**: purchase orders waiting for approval. This card only appears if you are allowed to approve purchase orders and there is at least one waiting. See [Purchase orders](/help/purchase-orders).
- **Villas** and **Assets**: how many villas and installed assets are registered (archived ones are not counted).

## Your work and what's late

Below the counters there are two lists of up to eight work orders each:

- **My open work orders**: the jobs assigned to you that are still open, the ones due soonest first (then by priority). Jobs without a due date come last.
- **Overdue**: open jobs across the company whose due date has passed, the most overdue first.

Each row shows the work order number, its title, the date and its status. Click a row to open the work order. **View all** opens the full list with the same filter, and **New work order** (shown if you can create work orders) starts a new one. See [Work orders](/help/work-orders).

> If **My open work orders** is empty but you expected jobs there, check that you are actually listed as an assignee on them. Being in the team that does the work is not enough.

## The getting started checklist

While a company is still being set up, a **Getting started** card at the bottom lists four steps:

1. **Invite your technicians and managers**: ticked once the company has more than one user. See [Users](/help/users).
2. **Add your clients and their villas**: ticked once there is at least one villa. See [Villas](/help/villas).
3. **Register the installed systems and equipment**: ticked once there is at least one asset. See [Assets](/help/assets).
4. **Set up preventive maintenance schedules**: ticked once there is an active schedule. See [Preventive maintenance](/help/preventive).

Click a step to go to the page where you do it. Steps that are done are crossed out, and the whole card disappears once all four are done.

## Who sees what

- Everyone who works in the company (every role except clients) sees the full dashboard: counters, lists and the checklist.
- The **POs to approve** card only appears for people who can approve purchase orders (by default the Super Admin and Administrators).
- The **New work order** buttons only appear for people who can create work orders (by default everyone except Viewers and Accountants).
- A role without access to internal information sees only the greeting.
- Clients never see this page: they go straight to the client portal.

> Looking for your jobs on a phone in the field? The [Field app](/help/field-app) shows the same assigned work and keeps working without signal.
`,
  pt: `# Painel

A sua página inicial: alguns contadores que mostram o que precisa de atenção em toda a empresa, as suas ordens de trabalho em aberto e os trabalhos que já estão atrasados.

## Para que serve o painel

O **Painel** é a primeira página que vê depois de iniciar sessão. Não substitui as listas (ordens de trabalho, pedidos, peças); diz-lhe por onde começar. Cada contador e cada linha é um link, por isso um clique leva-o à lista filtrada correspondente.

Os valores estão sempre atualizados: são calculados quando a página abre, por isso recarregue a página (ou volte a ela) para ver os números mais recentes.

![O painel: contadores no topo, as suas ordens de trabalho em aberto e as que estão em atraso por baixo](dashboard-overview)

## Pesquisar

A caixa no topo pesquisa todas as ordens de trabalho e as notas que os técnicos escreveram nelas. Escreva uma palavra, carregue em Enter e abre a página de [Pesquisa](/help/search) com os resultados.

## De prevenção esta semana

Por baixo da pesquisa, um cartão mostra quem está de prevenção esta semana, a pessoa que recebe todos os novos pedidos dos clientes (ou que ninguém está). Clique nele para abrir o calendário completo. Veja [Prevenção](/help/on-call).

## Os contadores

A fila de cartões no topo conta o que se passa em toda a empresa, não só o seu trabalho. Um número a vermelho significa que algo está mal e precisa de ação.

- **Ordens abertas**: todas as ordens de trabalho **Aberta**, **Em curso** ou **Em espera**. Abre a lista de ordens de trabalho.
- **Em atraso**: ordens de trabalho em aberto cujo prazo já passou. Fica a vermelho quando há pelo menos uma; abre a lista de ordens de trabalho filtrada pelas que estão em atraso.
- **Pedidos pendentes**: pedidos de clientes que ninguém aceitou nem recusou ainda. Abre [Pedidos](/help/requests).
- **Peças com stock baixo**: peças no mínimo ou abaixo da quantidade mínima, no total ou num local de stock que tenha o seu próprio mínimo. Fica a vermelho quando há pelo menos uma; abre a lista de peças filtrada por stock baixo. Veja [Peças e stock](/help/parts).
- **Encomendas por aprovar**: notas de encomenda à espera de aprovação. Este cartão só aparece se puder aprovar encomendas e houver pelo menos uma à espera. Veja [Encomendas](/help/purchase-orders).
- **Moradias** e **Equipamentos**: quantas moradias e equipamentos instalados estão registados (os arquivados não contam).

## O seu trabalho e o que está atrasado

Por baixo dos contadores há duas listas com até oito ordens de trabalho cada:

- **As minhas ordens abertas**: os trabalhos atribuídos a si que ainda estão em aberto, primeiro os de prazo mais próximo (depois por prioridade). Os trabalhos sem prazo aparecem no fim.
- **Em atraso**: trabalhos em aberto de toda a empresa cujo prazo já passou, primeiro os mais atrasados.

Cada linha mostra o número da ordem de trabalho, o título, a data e o estado. Clique numa linha para abrir a ordem de trabalho. **Ver tudo** abre a lista completa com o mesmo filtro, e **Nova ordem de trabalho** (visível se puder criar ordens de trabalho) cria uma nova. Veja [Ordens de trabalho](/help/work-orders).

> Se **As minhas ordens abertas** estiver vazia mas esperava ver lá trabalhos, confirme que está mesmo indicado como responsável neles. Pertencer à equipa que faz o trabalho não chega.

## A lista de primeiros passos

Enquanto a empresa ainda está a ser configurada, um cartão **Primeiros passos** no fundo mostra quatro passos:

1. **Convide os seus técnicos e gestores**: fica concluído quando a empresa tem mais do que um utilizador. Veja [Utilizadores](/help/users).
2. **Adicione os seus clientes e as respetivas moradias**: fica concluído quando existe pelo menos uma moradia. Veja [Moradias](/help/villas).
3. **Registe os sistemas e equipamentos instalados**: fica concluído quando existe pelo menos um equipamento. Veja [Equipamentos](/help/assets).
4. **Configure os planos de manutenção preventiva**: fica concluído quando existe um plano ativo. Veja [Manutenção preventiva](/help/preventive).

Clique num passo para ir à página onde o faz. Os passos concluídos aparecem riscados, e o cartão desaparece quando os quatro estiverem feitos.

## Quem vê o quê

- Todas as pessoas que trabalham na empresa (todas as funções exceto clientes) veem o painel completo: contadores, listas e a lista de primeiros passos.
- O cartão **Encomendas por aprovar** só aparece a quem pode aprovar encomendas (por defeito o Super Admin e os Administradores).
- Os botões **Nova ordem de trabalho** só aparecem a quem pode criar ordens de trabalho (por defeito todos exceto Observadores e Contabilistas).
- Uma função sem acesso à informação interna vê apenas a saudação.
- Os clientes nunca veem esta página: entram diretamente no portal do cliente.

> Procura os seus trabalhos no telemóvel, no terreno? A [App de campo](/help/field-app) mostra o mesmo trabalho atribuído e continua a funcionar sem rede.
`,
};

export default text;
