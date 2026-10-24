import type { HelpShot, HelpText } from "@/lib/help";

export const shots: HelpShot[] = [];

const text: HelpText = {
  en: `# Search

Find earlier jobs by any word written on them and in the villas' knowledge bases, so a problem someone already solved is quick to look up.

## What Search is for

When a technician meets a fault, the fastest help is often a job where a colleague saw the same thing. **Search** looks through every work order in the company, open or completed, and shows the ones that mention the words you type, with the passage where they appear highlighted.

It searches:

- the work order's **title** and **description**;
- the **client's request** the job came from;
- **comments**;
- **checklist** notes, and the answers to text steps;
- **time entry** notes;
- the notes written when the job's **status** changed (for example when it was put on hold);
- the **villa** and **asset** names, so you can add them to narrow the search.

It also searches the articles of every villa's [knowledge base](/help/villas): their title, text and linked assets.

Open it from **Search** in the menu, from the box at the top of the [Dashboard](/help/dashboard), from the magnifying glass in the top bar on a phone, or from the magnifying glass in the [Field app](/help/field-app).

## Searching

1. Type one or more words, for example *processor* or *KNX processor reboot*. The results appear as you type.
2. Each result shows the work order (number, status, title, villa and asset) and up to three notes where the words were found, newest and most relevant first: what kind of note it is, who wrote it and when.
3. Click the work order to open it. When more notes match than are shown, **more notes with these words** opens the work order too.

Matching knowledge-base articles are listed first, above the work orders: the title, the villa and linked assets, and the passage where the words were found. Click one to open the article. At most five are shown; if there are more, add a word, a villa or a system.

With several words, each word must appear somewhere in the work order, not necessarily in the same note. To see more of one villa or one kind of installation, choose a **Villa** or a **System** next to the search box.

## How words are matched

Search is forgiving, so you don't need to remember exactly how something was written:

- **Upper and lower case** and **accents** don't matter: *condensacao* finds *condensação*.
- **Part of a word** is enough: *proc* finds *processador* and *processor*.
- **Small typos** in words of four or more letters are tolerated: *procesador* finds *processador*.

The most relevant work orders come first. A search shows at most 50 of them; if there are more, add a word, a villa or a system to narrow it down.

## In the field app

The [Field app](/help/field-app) has the same search behind the magnifying glass at the top. It searches every job in the company, not only the ones on your phone, so it needs a connection; without one it says so, and your own jobs stay available offline. A result that is in your list opens in the field app; the others open the full work order page. Knowledge-base articles open their page in the full app.

## Who can use it

Everyone who works in the company (every role except clients) can search: Super Admin, Administrators, Managers, Technicians, Viewers and Accountants. Costs are never searched or shown in the results.
`,
  pt: `# Pesquisa

Encontre trabalhos anteriores por qualquer palavra escrita neles e nas bases de conhecimento das moradias, para consultar depressa um problema que alguém já resolveu.

## Para que serve a pesquisa

Quando um técnico encontra uma avaria, a ajuda mais rápida é muitas vezes um trabalho em que um colega viu o mesmo. A **Pesquisa** percorre todas as ordens de trabalho da empresa, abertas ou concluídas, e mostra as que mencionam as palavras que escrever, com a passagem onde aparecem destacada.

Pesquisa em:

- o **título** e a **descrição** da ordem de trabalho;
- o **pedido do cliente** que deu origem ao trabalho;
- os **comentários**;
- as notas da **lista de verificação** e as respostas aos passos de texto;
- as notas dos **registos de tempo**;
- as notas escritas quando o **estado** do trabalho mudou (por exemplo, ao pô-lo em espera);
- os nomes da **moradia** e do **equipamento**, para os poder juntar e restringir a pesquisa.

Pesquisa também os artigos da [base de conhecimento](/help/villas) de cada moradia: o título, o texto e os equipamentos ligados.

Abra-a em **Pesquisa** no menu, na caixa no topo do [Painel](/help/dashboard), na lupa da barra superior no telemóvel ou na lupa da [App de campo](/help/field-app).

## Pesquisar

1. Escreva uma ou mais palavras, por exemplo *processador* ou *processador KNX reinício*. Os resultados aparecem enquanto escreve.
2. Cada resultado mostra a ordem de trabalho (número, estado, título, moradia e equipamento) e até três notas onde as palavras foram encontradas, primeiro as mais relevantes e recentes: o tipo de nota, quem a escreveu e quando.
3. Clique na ordem de trabalho para a abrir. Quando há mais notas do que as mostradas, **mais notas com estas palavras** também abre a ordem de trabalho.

Os artigos da base de conhecimento que correspondem aparecem primeiro, acima das ordens de trabalho: o título, a moradia e os equipamentos ligados, e a passagem onde as palavras foram encontradas. Clique num para abrir o artigo. São mostrados no máximo cinco; se houver mais, junte uma palavra, uma moradia ou um sistema.

Com várias palavras, cada uma tem de aparecer algures na ordem de trabalho, não necessariamente na mesma nota. Para ver só uma moradia ou um tipo de instalação, escolha uma **Moradia** ou um **Sistema** ao lado da caixa de pesquisa.

## Como as palavras são comparadas

A pesquisa é tolerante, por isso não precisa de se lembrar exatamente de como algo foi escrito:

- **Maiúsculas** e **acentos** não importam: *condensacao* encontra *condensação*.
- **Parte de uma palavra** chega: *proc* encontra *processador* e *processor*.
- **Pequenos erros** em palavras com quatro ou mais letras são tolerados: *procesador* encontra *processador*.

As ordens de trabalho mais relevantes aparecem primeiro. Uma pesquisa mostra no máximo 50; se houver mais, junte uma palavra, uma moradia ou um sistema para a restringir.

## Na app de campo

A [App de campo](/help/field-app) tem a mesma pesquisa na lupa do topo. Pesquisa todos os trabalhos da empresa, não só os que estão no telemóvel, por isso precisa de ligação; sem ela, avisa, e os seus trabalhos continuam disponíveis sem rede. Um resultado que está na sua lista abre na app de campo; os outros abrem a página completa da ordem de trabalho. Os artigos da base de conhecimento abrem a sua página na aplicação completa.

## Quem a pode usar

Todos os que trabalham na empresa (todas as funções exceto clientes) podem pesquisar: Super Admin, Administradores, Gestores, Técnicos, Observadores e Contabilistas. Os custos nunca são pesquisados nem mostrados nos resultados.
`,
};

export default text;
