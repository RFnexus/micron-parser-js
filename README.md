Micron Parser JS
-
This repository provides a JavaScript parser for Micron, a lightweight, terminal-friendly markdown format used
in  [NomadNet](https://github.com/markqvist/NomadNet) and [MeshChatX](https://meshchatx.com/)

## Requirements

Micron Parser JS requires [DOMpurify](https://github.com/cure53/DOMPurify) for HTML/XSS sanitization. To install DOMpurify, include it with your script tags above micron-parser.js or install via a package manager like [NPM](https://www.npmjs.com/package/micron-parser) `npm install micron-parser`


## Usage

```js
// Import Micron Parser (requires modules)
import MicronParser from './js/micron-parser.js';

// Create a new parser (darkTheme = true/false | defaults to true, forceMonospace = true/false | defaults to true)
const parser = new MicronParser(true, true);

// Input Micron markup
const micronMarkup = `
> Example Heading
-∿
This is a simple line in Micron.
# This line is a comment and won't appear in the output.
`;

// Convert Micron to an HTML string
const htmlOutput = parser.convertMicronToHtml(micronMarkup);

// Insert it into your page
document.getElementById('yourElement').innerHTML = htmlOutput;

// Or create a DocumentFragment from Micron
const domFragment = parser.convertMicronToFragment(micronMarkup);
// and append it to the DOM
document.body.appendChild(domFragment);
```

## Partials

Micron-parser-js supports embedded partials The syntax is `` `{url`refresh`fields} `` where `refresh` is the seconds between reloads (must be `>= 1`) and `fields` is a `|`-separated list. A `pid=<id>` field gives the partial a stable identity for tracking across refreshes.

The parser emits a placeholder `<div class="Mu-partial">⧖</div>` with all the parsed metadata as `data-*` attributes. Wire it up with  `MicronParser.bindPartials(root, fetcher, options?)` in your application logic:

```js
const root = document.getElementById('output');
root.innerHTML = parser.convertMicronToHtml(micronMarkup);

const cleanup = MicronParser.bindPartials(root, async ({ destination, fields, id, signal }) => {
    const res = await fetch(`/proxy?path=${encodeURIComponent(destination)}`, { signal });
    return await res.text(); // returned as innerHTML; may also return a Node or { markup: string }
});

// when the view is torn down:
cleanup();
```

## Best practices

For optimal display of Micron content in the browser it's recommended to use a monospaced font with NerdFont icon support, such as the ones provided [here](https://www.nerdfonts.com/font-downloads).



