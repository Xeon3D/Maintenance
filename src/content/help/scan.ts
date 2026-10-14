import type { HelpShot, HelpText } from "@/lib/help";

export const shots: HelpShot[] = [];

const text: HelpText = {
  en: `# Scan

Point your phone's camera at an asset's QR label or a part's barcode and go straight to that asset or part, or type the code in by hand.

## What Scan is for

On site it's quicker to scan the label on a piece of equipment than to search for it. **Scan** opens the camera, reads the code and takes you to the matching record:

- an **asset QR label** (the labels printed from the app) opens that asset's page, with its details, history and work orders;
- a **part barcode** or **SKU** opens that part's page, with its stock in each location;
- an asset's **Asset tag** or **Serial number** opens that asset;
- an asset's **MAC address** (from the barcode on a device label, or typed) opens that asset.

Open it from **Scan** in the menu. On a phone there's also a scan button in the top bar, next to the bell, so it's always one tap away.

## Scanning a code

1. Open **Scan**. The camera opens straight away; the first time, the browser asks for permission to use it. Allow it.
2. Point the camera at the QR label or barcode and hold it steady. As soon as the code is read, the camera closes and the matching page opens.
3. If nothing matches, the page shows **Nothing matches** followed by the code that was read. Tap **Scan** to try again.

To close the camera without scanning, tap the cross (**Close**) at the top.

## Typing a code instead

Labels get dirty and barcodes get scratched. Below the camera there's a box, **Type a code, SKU or serial number**. Type the code and tap **Go**. The same rules apply as when scanning:

1. A part whose barcode or SKU matches (upper or lower case doesn't matter).
2. Otherwise, an asset whose **Asset tag** or **Serial number** matches.
3. Otherwise, if the code is a MAC address, the asset with that **MAC address**. It doesn't matter how it is written (00:1A:2B:3C:4D:5E, 00-1a-2b-3c-4d-5e, 001A2B3C4D5E or 001a.2b3c.4d5e).

Archived parts and assets are never matched.

## Which codes can be read

The camera reads QR codes, Data Matrix codes and the common barcodes printed on products and equipment labels (EAN, UPC, Code 128, Code 39, ITF and similar) on any recent phone or computer: Android, iPhone and iPad (Safari), Chrome, Firefox and Edge, on Windows or Mac. Thin barcodes read best when they fill a good part of the frame and are in focus. If a code still won't read, type the number printed under it.

> The camera only works when the app is opened over a secure address (https). If you see **No camera available here**, or **Camera access was blocked**, allow the camera in the browser's site settings, or simply type the code.

## Other places you can scan

- In the [Field app](/help/field-app), the scan button filters your list to the jobs for that asset, and works offline for the villas of your assigned jobs.
- On a work order, when recording parts used, **Scan barcode** picks the part for you, and the camera button next to the serial numbers reads the serial of each unit. See [Work orders](/help/work-orders).
- In **My van**, **Scan barcode** adds a part to the list to load or return. See [Parts](/help/parts).
- In the asset form, the **Serial number** and **MAC address** fields, and in the part form the **Barcode** field, have a camera button (**Read with the camera**). For serial numbers and MAC addresses it can also read the printed text on the label. See [Assets](/help/assets).

## When a client scans a label

The QR labels on equipment can also be scanned with any phone camera, without opening the app. A client signed in to the client portal is taken to a new request for that asset; someone without an account sees a short public page where they can report a problem. Staff who are signed in go to the asset's page. See [Assets](/help/assets) for printing labels and [Requests](/help/requests) for what happens to a reported problem.

## Who can use it

Everyone who works in the company (every role except clients) can use **Scan**: Super Admin, Administrators, Managers, Technicians, Viewers and Accountants. You can open the asset or part it finds; what you can change there depends on your role.
`,
  pt: `# Ler código

Aponte a câmara do telemóvel para a etiqueta QR de um equipamento ou para o código de barras de uma peça e vá diretamente a esse equipamento ou peça, ou escreva o código à mão.

## Para que serve a leitura de códigos

No local é mais rápido ler a etiqueta de um equipamento do que procurá-lo. **Ler código** abre a câmara, lê o código e leva-o ao registo correspondente:

- uma **etiqueta QR de equipamento** (as etiquetas impressas a partir da aplicação) abre a página desse equipamento, com os detalhes, o histórico e as ordens de trabalho;
- um **código de barras** ou **referência** de uma peça abre a página dessa peça, com o stock em cada local;
- a **Etiqueta** ou o **Número de série** de um equipamento abre esse equipamento;
- o **Endereço MAC** de um equipamento (do código de barras na etiqueta do aparelho, ou escrito) abre esse equipamento.

Abra em **Ler código** no menu. No telemóvel há também um botão de leitura na barra de topo, junto ao sino, sempre à distância de um toque.

## Ler um código

1. Abra **Ler código**. A câmara abre logo; da primeira vez, o navegador pede autorização para a usar. Permita.
2. Aponte a câmara para a etiqueta QR ou o código de barras e mantenha-a estável. Assim que o código é lido, a câmara fecha e abre-se a página correspondente.
3. Se nada corresponder, a página mostra **Nada corresponde a** seguido do código lido. Toque em **Ler código** para tentar novamente.

Para fechar a câmara sem ler nada, toque na cruz (**Fechar**) no topo.

## Escrever o código

As etiquetas sujam-se e os códigos de barras riscam-se. Por baixo da câmara há uma caixa, **Escreva um código, referência ou número de série**. Escreva o código e toque em **Ir**. Aplicam-se as mesmas regras da leitura:

1. Uma peça cujo código de barras ou referência corresponda (maiúsculas ou minúsculas não importam).
2. Caso contrário, um equipamento cuja **Etiqueta** ou **Número de série** corresponda.
3. Caso contrário, se o código for um endereço MAC, o equipamento com esse **Endereço MAC**. Não importa como está escrito (00:1A:2B:3C:4D:5E, 00-1a-2b-3c-4d-5e, 001A2B3C4D5E ou 001a.2b3c.4d5e).

As peças e os equipamentos arquivados nunca são encontrados.

## Que códigos podem ser lidos

A câmara lê códigos QR, códigos Data Matrix e os códigos de barras habituais dos produtos e das etiquetas dos equipamentos (EAN, UPC, Code 128, Code 39, ITF e semelhantes) em qualquer telemóvel ou computador recente: Android, iPhone e iPad (Safari), Chrome, Firefox e Edge, em Windows ou Mac. Os códigos de barras finos leem-se melhor quando ocupam boa parte da imagem e estão focados. Se mesmo assim um código não for lido, escreva o número impresso por baixo.

> A câmara só funciona quando a aplicação é aberta num endereço seguro (https). Se vir **Não há câmara disponível aqui**, ou **O acesso à câmara foi bloqueado**, permita a câmara nas definições do site no navegador, ou escreva simplesmente o código.

## Outros sítios onde pode ler códigos

- Na [App de campo](/help/field-app), o botão de leitura filtra a sua lista pelos trabalhos desse equipamento, e funciona sem rede para as moradias dos seus trabalhos atribuídos.
- Numa ordem de trabalho, ao registar as peças usadas, **Ler código de barras** escolhe a peça por si, e o botão da câmara junto aos números de série lê o número de série de cada unidade. Veja [Ordens de trabalho](/help/work-orders).
- Em **A minha carrinha**, **Ler código de barras** acrescenta uma peça à lista a carregar ou devolver. Veja [Peças e stock](/help/parts).
- No formulário do equipamento, os campos **Número de série** e **Endereço MAC**, e no formulário da peça o campo **Código de barras**, têm um botão de câmara (**Ler com a câmara**). Para números de série e endereços MAC também consegue ler o texto impresso na etiqueta. Veja [Equipamentos](/help/assets).

## Quando um cliente lê uma etiqueta

As etiquetas QR dos equipamentos também podem ser lidas com a câmara de qualquer telemóvel, sem abrir a aplicação. Um cliente com sessão iniciada no portal do cliente é levado a um novo pedido para esse equipamento; quem não tem conta vê uma pequena página pública onde pode comunicar um problema. Os colaboradores com sessão iniciada vão para a página do equipamento. Veja [Equipamentos](/help/assets) para imprimir etiquetas e [Pedidos](/help/requests) para saber o que acontece a um problema comunicado.

## Quem pode usar

Todas as pessoas que trabalham na empresa (todas as funções exceto clientes) podem usar **Ler código**: Super Admin, Administradores, Gestores, Técnicos, Observadores e Contabilistas. Pode abrir o equipamento ou a peça encontrados; o que pode alterar aí depende da sua função.
`,
};

export default text;
