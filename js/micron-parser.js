/**
 * Micron Parser JavaScript implementation
 *
 * micron-parser.js is based on MicronParser.py from NomadNet:
 * https://raw.githubusercontent.com/markqvist/NomadNet/refs/heads/master/nomadnet/ui/textui/MicronParser.py
 *
 * Documentation for the Micron markdown format can be found here:
 * https://raw.githubusercontent.com/markqvist/NomadNet/refs/heads/master/nomadnet/ui/textui/Guide.py
 */
 
class MicronParser {

    constructor(darkTheme = true, enableForceMonospace = true) {
        this.darkTheme = darkTheme;
        this.enableForceMonospace = enableForceMonospace;
        this.DEFAULT_FG_DARK = "ddd";
        this.DEFAULT_FG_LIGHT = "222";
        this.DEFAULT_BG = "default";

        if (this.enableForceMonospace) {
            this.injectMonospaceStyles();
        }

        try {
            if (typeof DOMPurify === 'undefined') {
                console.warn('DOMPurify is not installed. Include it above micron-parser.js or run npm install dompurify');
            }
        } catch (error) {
            console.warn('DOMPurify is not installed. Include it above micron-parser.js or run npm install dompurify');
        }

        this.STYLES_DARK = {
            "plain": {fg: this.DEFAULT_FG_DARK, bg: this.DEFAULT_BG, bold: false, underline: false, italic: false},
            "heading1": {fg: "222", bg: "bbb", bold: false, underline: false, italic: false},
            "heading2": {fg: "111", bg: "999", bold: false, underline: false, italic: false},
            "heading3": {fg: "000", bg: "777", bold: false, underline: false, italic: false}
        };

        this.STYLES_LIGHT = {
            "plain": {fg: this.DEFAULT_FG_LIGHT, bg: this.DEFAULT_BG, bold: false, underline: false, italic: false},
            "heading1": {fg: "000", bg: "777", bold: false, underline: false, italic: false},
            "heading2": {fg: "111", bg: "aaa", bold: false, underline: false, italic: false},
            "heading3": {fg: "222", bg: "ccc", bold: false, underline: false, italic: false}
        };

        this.SELECTED_STYLES = this.darkTheme ? this.STYLES_DARK : this.STYLES_LIGHT;

    }

    injectMonospaceStyles() {
        if (document.getElementById('micron-monospace-styles')) {
            return;
        }

        const styleEl = document.createElement('style');
        styleEl.id = 'micron-monospace-styles';

        styleEl.textContent = `
            .Mu-nl {
                cursor: pointer;
            }
            .Mu-mnt {
                display: inline-block;
                width: 0.6em;
                text-align: center;
                white-space: pre;
                text-decoration: inherit;
            }
            .Mu-mws {
                text-decoration: inherit;
                display: inline-block;
            }
        `;
        document.head.appendChild(styleEl);
    }

    static formatNomadnetworkUrl(url) {
        if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(url)) {
            return url;
        }
        return `nomadnetwork://${url}`;
    }


    parseHeaderTags(markup) {
        let pageFg = null;
        let pageBg = null;

        const lines = markup.split("\n");

        for (let line of lines) {
            const trimmedLine = line.trim();

            if (trimmedLine.length === 0) {
                continue;
            }

            if (!trimmedLine.startsWith("#!")) {
                break;
            }

            if (trimmedLine.startsWith("#!fg=")) {
                let color = trimmedLine.substring(5).trim();
                if (color.length === 3 || color.length === 6) {
                    pageFg = color;
                }
            }

            if (trimmedLine.startsWith("#!bg=")) {
                let color = trimmedLine.substring(5).trim();
                if (color.length === 3 || color.length === 6) {
                    pageBg = color;
                }
            }
        }

        return { fg: pageFg, bg: pageBg };
    }

    convertMicronToHtml(markup) {
        let html = "";

        // parse header tags for page-level color defaults
        const headerColors = this.parseHeaderTags(markup);

        const plainStyle = this.SELECTED_STYLES?.plain || {fg: this.DEFAULT_FG_DARK, bg: this.DEFAULT_BG};
        const defaultFg = headerColors.fg || plainStyle.fg;
        const defaultBg = headerColors.bg || this.DEFAULT_BG;

        let state = {
            literal: false,
            depth: 0,
            fg_color: defaultFg,
            bg_color: defaultBg,
            formatting: {
                bold: false,
                underline: false,
                italic: false,
                strikethrough: false
            },
            default_align: "left",
            align: "left",
            default_fg: defaultFg,
            default_bg: defaultBg,
            radio_groups: {}
        };

        const lines = markup.split("\n");

        for (let line of lines) {
            const lineOutput = this.parseLine(line, state);
            if (lineOutput && lineOutput.length > 0) {
                for (let el of lineOutput) {
                    html += el.outerHTML;
                }
            } else if (lineOutput && lineOutput.length === 0) {
                // skip
            } else {
                html += "<br>";
            }
        }

        // wrap in container with page-level colors
        let containerStyle = "";
        if (defaultFg && defaultFg !== "default") {
            containerStyle += `color: ${this.colorToCss(defaultFg)};`;
        }
        if (defaultBg && defaultBg !== "default") {
            containerStyle += `background-color: ${this.colorToCss(defaultBg)};`;
        }
        if (containerStyle) {
            html = `<div style="${containerStyle}">${html}</div>`;
        }

       try {
        return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
       } catch (error) {
            console.warn('DOMPurify is not installed. Include it above micron-parser.js or run npm install dompurify ', error);
            return `<p style="color: red;"> ⚠ DOMPurify is not installed. Include it above micron-parser.js or run npm install dompurify </p>`;
       }
    }

    convertMicronToFragment(markup) {
        // Create a fragment to hold all the Micron output
        const fragment = document.createDocumentFragment();

        const headerColors = this.parseHeaderTags(markup);

        const plainStyle = this.SELECTED_STYLES?.plain || {fg: this.DEFAULT_FG_DARK, bg: this.DEFAULT_BG};
        const defaultFg = headerColors.fg || plainStyle.fg;
        const defaultBg = headerColors.bg || this.DEFAULT_BG;

        let state = {
            literal: false,
            depth: 0,
            fg_color: defaultFg,
            bg_color: defaultBg,
            formatting: {
                bold: false,
                underline: false,
                italic: false,
                strikethrough: false
            },
            default_align: "left",
            align: "left",
            default_fg: defaultFg,
            default_bg: defaultBg,
            radio_groups: {}
        };

        // create container div for page-level colors
        const container = document.createElement("div");
        if (defaultFg && defaultFg !== "default") {
            container.style.color = this.colorToCss(defaultFg);
        }
        if (defaultBg && defaultBg !== "default") {
            container.style.backgroundColor = this.colorToCss(defaultBg);
        }

        const lines = markup.split("\n");

        for (let line of lines) {
            line = DOMPurify.sanitize(line, { USE_PROFILES: { html: true } });
            const lineOutput = this.parseLine(line, state);
            if (lineOutput && lineOutput.length > 0) {
                for (let el of lineOutput) {

                    container.appendChild(el);
                }
            } else if (lineOutput && lineOutput.length === 0) {
                // skip
            } else {
                container.appendChild(document.createElement("br"));
            }
        }

        fragment.appendChild(container);
        return fragment;
    }

    parseLine(line, state) {
        if (line.length > 0) {
            if (line === "`=") {
                state.literal = !state.literal;
                return [];
            }

            let preEscape = false;

            if (!state.literal) {
                if (line[0] === ">" && line.includes("`<")) {
                    line = line.replace(/^>+/, "");
                }

                if (line[0] === "\\") {
                    line = line.slice(1);
                    preEscape = true;
                } else if (line[0] === "#") {
                    return [];
                } else if (line.startsWith("`{")) {
                    return this.parsePartial(line.slice(2)) || [];
                } else if (line[0] === "<") {
                    state.depth = 0;
                    if (line.length === 1) return [];
                    return this.parseLine(line.slice(1), state);
                } else if (line[0] === ">") {
                    let i = 0;
                    while (i < line.length && line[i] === ">") {
                        i++;
                    }
                    state.depth = i;
                    let headingLine = line.slice(i);

                    if (headingLine.length > 0) {
                        const defaultPlain = {fg: this.darkTheme ? this.DEFAULT_FG_DARK : this.DEFAULT_FG_LIGHT, bg: this.DEFAULT_BG, bold: false, underline: false, italic: false};
                        let style = this.SELECTED_STYLES?.plain || defaultPlain;
                        for (let d = 1; d <= i; d++) {
                            if (this.SELECTED_STYLES?.[`heading${d}`]) {
                                style = this.SELECTED_STYLES[`heading${d}`];
                            }
                        }

                        const latched_style = this.stateToStyle(state);
                        this.styleToState(style, state);

                        let outputParts = this.makeOutput(state, headingLine);
                        this.styleToState(latched_style, state);

                        if (outputParts && outputParts.length > 0) {
                            const outerDiv = document.createElement("div");
                            this.applyStyleToElement(outerDiv, style);
                            outerDiv.style.display = "block";
                            outerDiv.style.width = "100%";

                            const innerDiv = document.createElement("div");
                            this.applySectionIndent(innerDiv, state);
                            this.applyAlignment(innerDiv, state);

                            this.appendOutput(innerDiv, outputParts, state);
                            outerDiv.appendChild(innerDiv);

                            return [outerDiv];
                        }
                    }
                    return [];
                } else if (line[0] === "-") {
                    if (line.length === 1) {
                        const hr = document.createElement("hr");
                        hr.style.all = "revert";
                        hr.style.borderColor = this.colorToCss(state.fg_color);
                        hr.style.margin = "0.5em 0.5em 0.5em 0.5em";
                        hr.style.boxShadow = "0 0 0 0.5em " + this.colorToCss(state.bg_color);
                        this.applySectionIndent(hr, state);
                        return [hr];
                    }

                    let dividerChar = "─";
                    if (line.length === 2) {
                        const candidate = Array.from(line)[1];
                        if (candidate && candidate.codePointAt(0) >= 32) {
                            dividerChar = candidate;
                        }
                    }
                    const repeated = dividerChar.repeat(250);

                    const div = document.createElement("div");
                    div.textContent = repeated;
                    div.style.width = "100%";
                    div.style.whiteSpace = "nowrap";
                    div.style.overflow = "hidden";
                    div.style.color = this.colorToCss(state.fg_color);
                    if (state.bg_color !== state.default_bg && state.bg_color !== "default") {
                        div.style.backgroundColor = this.colorToCss(state.bg_color);
                    }
                    this.applySectionIndent(div, state);

                    return [div];
                }
            }

            let outputParts = this.makeOutput(state, line, preEscape);
            if (!outputParts || outputParts.length === 0) {
                return [];
            }

            let container = document.createElement("div");
            this.applyAlignment(container, state);
            this.applySectionIndent(container, state);

            this.appendOutput(container, outputParts, state);

            if (state.bg_color !== state.default_bg && state.bg_color !== "default") {
                const outerDiv = document.createElement("div");
                outerDiv.style.backgroundColor = this.colorToCss(state.bg_color);
                outerDiv.style.width = "100%";
                outerDiv.style.display = "block";
                outerDiv.appendChild(container);
                return [outerDiv];
            }
            return [container];
        } else {
            // Empty line handling for just newline background color
            const br = document.createElement("br");
            if (state.bg_color !== state.default_bg && state.bg_color !== "default") {
                const outerDiv = document.createElement("div");
                outerDiv.style.backgroundColor = this.colorToCss(state.bg_color);
                outerDiv.style.width = "100%";
                outerDiv.style.height = "1.2em";
                outerDiv.style.display = "block";

                const innerDiv = document.createElement("div");
                this.applySectionIndent(innerDiv, state);
                innerDiv.appendChild(br);
                outerDiv.appendChild(innerDiv);

                return [outerDiv];
            }
            return [br];
        }
    }

    applyAlignment(el, state) {
        // use CSS text-align for alignment
        el.style.textAlign = state.align || "left";
    }

    applySectionIndent(el, state) {
        // indent by state.depth
        let indent = (state.depth - 1) * 2;
        if (indent > 0 ) {
            // Indent according to forceMonospace() character width
            el.style.marginLeft = (indent * 0.6) + "em";
        }
    }

    // convert current state to a style object
    stateToStyle(state) {
        return {
            fg: state.fg_color,
            bg: state.bg_color,
            bold: state.formatting.bold,
            underline: state.formatting.underline,
            italic: state.formatting.italic
        };
    }

    styleToState(style, state) {
        if (style.fg !== undefined && style.fg !== null) state.fg_color = style.fg;
        if (style.bg !== undefined && style.bg !== null) state.bg_color = style.bg;
        if (style.bold !== undefined && style.bold !== null) state.formatting.bold = style.bold;
        if (style.underline !== undefined && style.underline !== null) state.formatting.underline = style.underline;
        if (style.italic !== undefined && style.italic !== null) state.formatting.italic = style.italic;
    }

    appendOutput(container, parts, state) {

        let currentSpan = null;
        let currentStyle = null;

         const flushSpan = () => {
            if (currentSpan) {
                if (currentStyle && currentStyle.bg !== state.default_bg && currentStyle.bg !== "default") {
                    currentSpan.style.display = "inline-block";
                }
                container.appendChild(currentSpan);
                currentSpan = null;
                currentStyle = null;
            }
        };

        for (let p of parts) {
            if (typeof p === 'string') {
                let span = document.createElement("span");
                span.innerHTML = p;
                container.appendChild(span);
            } else if (Array.isArray(p) && p.length === 2) {
                // tuple: [styleSpec, text]
                let [styleSpec, text] = p;
                // if different style, flush currentSpan
                if (!this.stylesEqual(styleSpec, currentStyle)) {
                    flushSpan();
                    currentSpan = document.createElement("span");
                    this.applyStyleToElement(currentSpan, styleSpec, state.default_bg);
                    currentStyle = styleSpec;
                }
                currentSpan.innerHTML += text;
            } else if (p && typeof p === 'object') {
                // field, checkbox, radio, link
                flushSpan();
                if (p.type === "field") {
                    let input = document.createElement("input");
                    input.type = p.masked ? "password" : "text";
                    input.name = p.name;
                    input.setAttribute('value', p.data);
                    if (p.width) {
                        input.size = p.width;
                    }
                    this.applyStyleToElement(input, this.styleFromState(p.style), state.default_bg);
                    container.appendChild(input);
                } else if (p.type === "checkbox") {
                    let label = document.createElement("label");
                    let cb = document.createElement("input");
                    cb.type = "checkbox";
                    cb.name = p.name;
                    cb.value = p.value;
                    if (p.prechecked) cb.setAttribute('checked', true);
                    label.appendChild(cb);
                    label.appendChild(document.createTextNode(" " + p.label));
                    this.applyStyleToElement(label, this.styleFromState(p.style), state.default_bg);
                    container.appendChild(label);
                } else if (p.type === "radio") {
                    let label = document.createElement("label");
                    let rb = document.createElement("input");
                    rb.type = "radio";
                    rb.name = p.name;
                    rb.value = p.value;
                    if (p.prechecked) rb.setAttribute('checked', true);
                    label.appendChild(rb);
                    label.appendChild(document.createTextNode(" " + p.label));
                    this.applyStyleToElement(label, this.styleFromState(p.style), state.default_bg);
                    container.appendChild(label);
                } else if (p.type === "link") {

                    let directURL = p.url.replace('nomadnetwork://', '').replace('lxmf://', '');
                    // use p.url as is for the href
                    const formattedUrl = p.url;

                    let a = document.createElement("a");
                    a.href = formattedUrl;
                    a.title = formattedUrl;

                    let fieldsToSubmit = [];
                    let requestVars = {};
                    let foundAll = false;

                    if (p.fields && p.fields.length > 0) {
                        for (const f of p.fields) {
                            if (f === '*') {
                                // submit all fields
                                foundAll = true;
                            } else if (f.includes('=')) {
                                // this is a request variable (key=value)
                                const [k, v] = f.split('=');
                                requestVars[k] = v;
                            } else {
                                // this is a field name to submit
                                fieldsToSubmit.push(f);
                            }
                        }

                        let fieldStr = '';
                        if (foundAll) {
                            // if '*' was found, submit all fields
                            fieldStr = '*';
                        } else {
                            fieldStr = fieldsToSubmit.join('|');
                        }

                        // append request variables directly to the directURL as query parameters
                        const varEntries = Object.entries(requestVars);
                        if (varEntries.length > 0) {
                            const queryString = varEntries.map(([k, v]) => `${k}=${v}`).join('|');

                            directURL += directURL.includes('`') ? `|${queryString}` : `\`${queryString}`;
                        }

                        a.setAttribute("data-destination", `${directURL}`);
                        a.setAttribute("data-fields", `${fieldStr}`);
                    } else {
                        // no fields or request variables, just handle the direct URL
                        a.setAttribute("data-destination", `${directURL}`);
                    }
                    a.classList.add('Mu-nl');
                    a.setAttribute('data-action', "openNode");
                    a.innerHTML = p.label;
                    this.applyStyleToElement(a, this.styleFromState(p.style), state.default_bg);
                    container.appendChild(a);
                }

            }
        }

        flushSpan();
    }

    stylesEqual(s1, s2) {
        if (!s1 && !s2) return true;
        if (!s1 || !s2) return false;
        return (s1.fg === s2.fg && s1.bg === s2.bg && s1.bold === s2.bold && s1.underline === s2.underline && s1.italic === s2.italic);
    }

    styleFromState(stateStyle) {
        // stateStyle is a name of a style or a style object
        // in this code, p.style is actually a style name. j,ust return that
        return stateStyle;
    }

applyStyleToElement(el, style, defaultBg = "default") {
        if (!style) return;
        // convert style fg/bg to colors
        let fgColor = this.colorToCss(style.fg);
        let bgColor = this.colorToCss(style.bg);

        if (fgColor && fgColor !== "default") {
            el.style.color = fgColor;
        }
        if (bgColor && bgColor !== "default" && style.bg !== defaultBg) {
            el.style.backgroundColor = bgColor;
            el.style.display = "inline-block";
        }

        if (style.bold) {
            el.style.fontWeight = "bold";
        }
        if (style.underline) {
            el.style.textDecoration = (el.style.textDecoration ? el.style.textDecoration + " underline" : "underline");
        }
        if (style.italic) {
            el.style.fontStyle = "italic";
        }
    }

    colorToCss(c) {
        if (!c || c === "default") return null;
        // if 3 hex chars (like '222') => expand to #222
        if (c.length === 3 && /^[0-9a-fA-F]{3}$/.test(c)) {
            return "#" + c;
        }
        // If 6 hex chars
        if (c.length === 6 && /^[0-9a-fA-F]{6}$/.test(c)) {
            return "#" + c;
        }
        // If grayscale 'gxx'
        if (c.length === 3 && c[0] === 'g') {
            // treat xx as a number and map to gray
            let val = parseInt(c.slice(1), 10);
            if (isNaN(val)) val = 50;
            // map 0-99 scale to a gray hex
            let h = Math.floor(val * 2.55).toString(16).padStart(2, '0');
            return "#" + h + h + h;
        }

        // fallback: just return a known CSS color or tailwind class if not known
        return null;
    }

    makeOutput(state, line, preEscape = false) {
        if (state.literal) {
            if (line === "\\`=") {
                line = "`=";
            }
            if(this.enableForceMonospace) {
                return [[this.stateToStyle(state), this.splitAtSpaces(line)]];
            } else {
                return [[this.stateToStyle(state), line]];
            }
        }

        let output = [];
        let part = "";
        let mode = "text";
        let escape = preEscape;
        let skip = 0;

        const flushPart = () => {
            if (part.length > 0) {
                if(this.enableForceMonospace) {
                    output.push([this.stateToStyle(state), this.splitAtSpaces(part)]);
                } else {
                    output.push([this.stateToStyle(state), part]);
                }
                part = "";
            }
        };

        let i = 0;
        while (i < line.length) {
            let c = line[i];

            if (skip > 0) {
                skip--;
                i++;
                continue;
            }

            if (mode === "formatting") {
                switch (c) {
                    case '_':
                        state.formatting.underline = !state.formatting.underline;
                        break;
                    case '!':
                        state.formatting.bold = !state.formatting.bold;
                        break;
                    case '*':
                        state.formatting.italic = !state.formatting.italic;
                        break;
                    case 'F':
                        if (line[i+1] == "T" && line.length >= i + 8) {
                            let color = line.substr(i + 2, 6);
                            state.fg_color = color;
                            skip = 7;
                            break;
                        }

                        if (line[i+4] == "`" && line[i+5] == "F" && line.length >= i + 9) {
                            let color = line[i+6]+line[i+1]+line[i+7]+line[i+2]+line[i+8]+line[i+3];
                            state.fg_color = color;
                            skip = 8;
                            break;
                        }

                        if (line.length >= i + 4) {
                            let color = line.substr(i + 1, 3);
                            state.fg_color = color;
                            skip = 3;
                        }
                        break;
                    case 'f':
                        // reset fg to page default
                        state.fg_color = state.default_fg;
                        break;
                    case 'B':
                        if (line[i+1] == "T" && line.length >= i + 8) {
                            let color = line.substr(i + 2, 6);
                            state.bg_color = color;
                            skip = 7;
                            flushPart();
                            break;
                        }

                        if (line[i+4] == "`" && line[i+5] == "B" && line.length >= i + 9) {
                            let color = line[i+6]+line[i+1]+line[i+7]+line[i+2]+line[i+8]+line[i+3];
                            state.bg_color = color;
                            skip = 8;
                            flushPart();
                            break;
                        }

                        if (line.length >= i + 4) {
                            let color = line.substr(i + 1, 3);
                            state.bg_color = color;
                            skip = 3;
                            flushPart();
                        }
                        break;
                    case 'b':
                        // reset bg to page default
                        state.bg_color = state.default_bg;
                        flushPart(); // flush to allow for ` tags on same line
                        break;
                    case '`':
                        state.formatting.bold = false;
                        state.formatting.underline = false;
                        state.formatting.italic = false;
                        state.fg_color = state.default_fg;
                        state.bg_color = state.default_bg;
                        state.align = state.default_align;
                        mode = "text";
                        break;
                    case 'c':
                        state.align = 'center';
                        break;
                    case 'l':
                        state.align = 'left';
                        break;
                    case 'r':
                        state.align = 'right';
                        break;
                    case 'a':
                        state.align = state.default_align;
                        break;

                    case '<':
                        // if there's already text, flush it
                        flushPart();
                        let fieldData = this.parseField(line, i, state);
                        if (fieldData) {
                            output.push(fieldData.obj);
                            i += fieldData.skip;
                            // do not i++ here or we'll skip an extra char
                            continue;
                        }
                        break;

                    case '[':
                        // flush current text first
                        flushPart();
                        let linkData = this.parseLink(line, i, state);
                        if (linkData) {
                            output.push(linkData.obj);
                            i += linkData.skip;
                            continue;
                        }
                        break;

                    default:
                        // unknown formatting char, ignore
                        break;
                }
                mode = "text";
                i++;
                continue;

            } else {
                // mode === "text"
                if (escape) {
                    part += c;
                    escape = false;
                } else if (c === '\\') {
                    escape = true;
                } else if (c === '`') {
                    if (i + 1 < line.length && line[i + 1] === '`') {
                        flushPart();
                        state.formatting.bold = false;
                        state.formatting.underline = false;
                        state.formatting.italic = false;
                        state.fg_color = state.default_fg;
                        state.bg_color = state.default_bg;
                        state.align = state.default_align;
                        i += 2;
                        continue;
                    } else {
                        flushPart();
                        mode = "formatting";
                        i++;
                        continue;
                    }
                } else {
                    // normal text char
                    part += c;
                }
                i++;
            }
        }
        // end of line
        if (part.length > 0) {
            if(this.enableForceMonospace) {
                output.push([this.stateToStyle(state), this.splitAtSpaces(part)]);
            } else {
                output.push([this.stateToStyle(state), part]);
            }
        }

        return output;
    }

    parseField(line, startIndex, state) {
        let field_start = startIndex + 1;
        let backtick_pos = line.indexOf('`', field_start);
        if (backtick_pos === -1) return null;

        let field_content = line.substring(field_start, backtick_pos);
        let field_masked = false;
        let field_width = 24;
        let field_type = "field";
        let field_name = field_content;
        let field_value = "";
        let field_prechecked = false;

        if (field_content.includes('|')) {
            let f_components = field_content.split('|');
            let field_flags = f_components[0];
            field_name = f_components[1];

            if (field_flags.includes('^')) {
                field_type = "radio";
                field_flags = field_flags.replace('^', '');
            } else if (field_flags.includes('?')) {
                field_type = "checkbox";
                field_flags = field_flags.replace('?', '');
            } else if (field_flags.includes('!')) {
                field_masked = true;
                field_flags = field_flags.replace('!', '');
            }

            if (field_flags.length > 0) {
                let w = parseInt(field_flags, 10);
                if (!isNaN(w)) {
                    field_width = Math.min(w, 256);
                }
            }

            if (f_components.length > 2) {
                field_value = f_components[2];
            }

            if (f_components.length > 3) {
                if (f_components[3] === '*') {
                    field_prechecked = true;
                }
            }
        }

        let field_end = line.indexOf('>', backtick_pos);
        if (field_end === -1) return null;

        let field_data = line.substring(backtick_pos + 1, field_end);
        let style = this.stateToStyle(state);

        let obj = null;
        if (field_type === "checkbox" || field_type === "radio") {
            obj = {
                type: field_type,
                name: field_name,
                value: field_value || field_data,
                label: field_data,
                prechecked: field_prechecked,
                style: style
            };
        } else {
            obj = {
                type: "field",
                name: field_name,
                width: field_width,
                masked: field_masked,
                data: field_data,
                style: style
            };
        }

        let skip = (field_end - startIndex);
        return {obj: obj, skip: skip};
    }

    parseLink(line, startIndex, state) {
        let endpos = line.indexOf(']', startIndex);
        if (endpos === -1) return null;

        let link_data = line.substring(startIndex + 1, endpos);
        let link_components = link_data.split('`');
        let link_label = "";
        let link_url = "";
        let link_fields = "";

        if (link_components.length === 1) {
            link_label = "";
            link_url = link_data;
        } else if (link_components.length === 2) {
            link_label = link_components[0];
            link_url = link_components[1];
        } else if (link_components.length === 3) {
            link_label = link_components[0];
            link_url = link_components[1];
            link_fields = link_components[2];
        }

        if (link_url.length === 0) {
            return null;
        }

        if (link_label === "") {
            link_label = link_url;
        }

        // format the URL
        link_url = MicronParser.formatNomadnetworkUrl(link_url);

        // Apply forceMonospace
        if(this.enableForceMonospace) {
            link_label = this.splitAtSpaces(link_label);
        }

        let style = this.stateToStyle(state);
        let obj = {
            type: "link",
            url: link_url,
            label: link_label,
            fields: (link_fields ? link_fields.split("|") : []),
            style: style
        };

        let skip = (endpos - startIndex);
        return {obj: obj, skip: skip};
    }

    parsePartial(line) {
        const endpos = line.indexOf("}");
        if (endpos === -1) return null;

        const data = line.substring(0, endpos);
        const components = data.split("`");

        let partial_url = "";
        let partial_refresh = null;
        let partial_fields_str = "";

        if (components.length === 1) {
            partial_url = components[0];
        } else if (components.length === 2) {
            partial_url = components[0];
            const r = parseFloat(components[1]);
            if (!isNaN(r)) partial_refresh = r;
        } else if (components.length === 3) {
            partial_url = components[0];
            const r = parseFloat(components[1]);
            if (!isNaN(r)) partial_refresh = r;
            partial_fields_str = components[2];
        }

        if (partial_refresh !== null && partial_refresh < 1) partial_refresh = null;

        let partial_id = null;
        const partial_fields = partial_fields_str.length > 0 ? partial_fields_str.split("|") : [];
        for (const f of partial_fields) {
            if (f.startsWith("pid=")) {
                partial_id = f.substring(4);
            }
        }

        if (!partial_url) return null;

        const formattedUrl = MicronParser.formatNomadnetworkUrl(partial_url);
        const el = document.createElement("div");
        el.className = "Mu-partial";
        el.textContent = "⧖";
        el.setAttribute("data-partial-url", formattedUrl);
        el.setAttribute("data-partial-destination", partial_url);
        el.setAttribute("data-partial-descriptor", data);
        if (partial_id !== null) el.setAttribute("data-partial-id", partial_id);
        if (partial_refresh !== null) el.setAttribute("data-partial-refresh", String(partial_refresh));
        if (partial_fields.length > 0) el.setAttribute("data-partial-fields", partial_fields.join("|"));

        return [el];
    }

    static upgradeInputToTextarea(input, options = {}) {
        if (!input || !input.tagName || input.tagName.toLowerCase() === "textarea") return input;
        const owner = input.ownerDocument || (typeof document !== "undefined" ? document : null);
        if (!owner) return input;
        const inputType = (input.type || "").toLowerCase();
        if (inputType === "password") return input;

        const ta = owner.createElement("textarea");
        ta.name = input.name;
        const currentValue = (typeof input.value === "string" && input.value.length > 0)
            ? input.value
            : (input.getAttribute("value") || "");
        ta.value = currentValue;

        const cols = (typeof options.cols === "number") ? options.cols
            : (input.size > 0 ? input.size : null);
        if (cols) ta.cols = cols;
        if (typeof options.rows === "number") ta.rows = options.rows;
        else if (!ta.rows || ta.rows < 2) ta.rows = 4;
        if (options.wrap) ta.wrap = options.wrap;
        if (input.disabled) ta.disabled = true;
        if (input.readOnly) ta.readOnly = true;
        if (input.placeholder) ta.placeholder = input.placeholder;
        if (input.required) ta.required = true;
        if (input.autocomplete) ta.autocomplete = input.autocomplete;

        if (input.style && input.style.cssText) ta.style.cssText = input.style.cssText;

        const skipAttrs = new Set(["type", "value", "size", "name"]);
        for (const attr of Array.from(input.attributes || [])) {
            if (skipAttrs.has(attr.name)) continue;
            if (attr.name === "style") continue;
            try { ta.setAttribute(attr.name, attr.value); } catch (e) {}
        }
        if (input.classList && input.classList.length > 0) {
            ta.className = input.className;
        }

        const wasFocused = (owner.activeElement === input);
        const selStart = (typeof input.selectionStart === "number") ? input.selectionStart : null;
        const selEnd = (typeof input.selectionEnd === "number") ? input.selectionEnd : null;

        ta.setAttribute("data-micron-original-tag", "input");
        ta.setAttribute("data-micron-original-type", input.type || "text");

        input.replaceWith(ta);

        if (wasFocused && typeof ta.focus === "function") {
            try {
                ta.focus();
                if (selStart !== null && selEnd !== null && typeof ta.setSelectionRange === "function") {
                    ta.setSelectionRange(selStart, selEnd);
                }
            } catch (e) {}
        }

        ta.dispatchEvent(new CustomEvent("micron-field-upgraded", {
            bubbles: true,
            detail: { from: "input", to: "textarea", element: ta, previous: input }
        }));
        return ta;
    }

    static upgradeTextareaToInput(textarea, options = {}) {
        if (!textarea || !textarea.tagName || textarea.tagName.toLowerCase() === "input") return textarea;
        const owner = textarea.ownerDocument || (typeof document !== "undefined" ? document : null);
        if (!owner) return textarea;

        const input = owner.createElement("input");
        const originalType = textarea.getAttribute("data-micron-original-type");
        input.type = options.type || originalType || (options.masked ? "password" : "text");
        input.name = textarea.name;
        input.setAttribute("value", textarea.value || "");
        const size = (typeof options.size === "number") ? options.size
            : (textarea.cols > 0 ? textarea.cols : null);
        if (size) input.size = size;
        if (textarea.disabled) input.disabled = true;
        if (textarea.readOnly) input.readOnly = true;
        if (textarea.placeholder) input.placeholder = textarea.placeholder;
        if (textarea.required) input.required = true;
        if (textarea.autocomplete) input.autocomplete = textarea.autocomplete;

        if (textarea.style && textarea.style.cssText) input.style.cssText = textarea.style.cssText;

        const skipAttrs = new Set(["rows", "cols", "wrap", "value", "name", "data-micron-original-tag", "data-micron-original-type"]);
        for (const attr of Array.from(textarea.attributes || [])) {
            if (skipAttrs.has(attr.name)) continue;
            if (attr.name === "style") continue;
            try { input.setAttribute(attr.name, attr.value); } catch (e) {}
        }
        if (textarea.classList && textarea.classList.length > 0) {
            input.className = textarea.className;
        }

        const wasFocused = (owner.activeElement === textarea);
        const selStart = (typeof textarea.selectionStart === "number") ? textarea.selectionStart : null;
        const selEnd = (typeof textarea.selectionEnd === "number") ? textarea.selectionEnd : null;

        textarea.replaceWith(input);

        if (wasFocused && typeof input.focus === "function") {
            try {
                input.focus();
                if (selStart !== null && selEnd !== null && typeof input.setSelectionRange === "function") {
                    input.setSelectionRange(selStart, selEnd);
                }
            } catch (e) {}
        }

        input.dispatchEvent(new CustomEvent("micron-field-upgraded", {
            bubbles: true,
            detail: { from: "textarea", to: "input", element: input, previous: textarea }
        }));
        return input;
    }

    static enableDoubleEnterMultiline(root, options = {}) {
        if (!root || typeof root.addEventListener !== "function") return () => {};
        const windowMs = typeof options.windowMs === "number" ? options.windowMs : 500;
        const rows = typeof options.rows === "number" ? options.rows : 4;
        const filter = typeof options.filter === "function" ? options.filter : null;
        const suppressFirst = options.suppressFirstEnter !== false;
        const lastEnter = new WeakMap();
        const armTimers = new WeakMap();

        const disarm = (el) => {
            if (lastEnter.has(el)) {
                lastEnter.delete(el);
                try {
                    el.dispatchEvent(new CustomEvent("micron-multiline-disarmed", {
                        bubbles: true,
                        detail: { element: el }
                    }));
                } catch (_) {}
            }
            const t = armTimers.get(el);
            if (t) {
                clearTimeout(t);
                armTimers.delete(el);
            }
        };

        const onKey = (e) => {
            if (e.key !== "Enter" || e.isComposing) return;
            if (e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
            const el = e.target;
            if (!el || el.tagName !== "INPUT") return;
            const t = (el.type || "text").toLowerCase();
            if (t === "password") return;
            if (t !== "text" && t !== "") return;
            if (filter && !filter(el)) return;

            const now = Date.now();
            const prev = lastEnter.get(el) || 0;
            if (prev > 0 && (now - prev) <= windowMs) {
                e.preventDefault();
                disarm(el);
                const cursor = (typeof el.selectionStart === "number") ? el.selectionStart : el.value.length;
                const ta = MicronParser.upgradeInputToTextarea(el, { rows });
                const before = (ta.value || "").slice(0, cursor);
                const after = (ta.value || "").slice(cursor);
                ta.value = before + "\n" + after;
                try {
                    ta.focus();
                    if (typeof ta.setSelectionRange === "function") {
                        ta.setSelectionRange(before.length + 1, before.length + 1);
                    }
                } catch (_) {}
                try {
                    ta.dispatchEvent(new CustomEvent("micron-field-multiline-enabled", {
                        bubbles: true,
                        detail: { element: ta, trigger: "double-enter" }
                    }));
                } catch (_) {}
                return;
            }
            if (suppressFirst) e.preventDefault();
            lastEnter.set(el, now);
            try {
                el.dispatchEvent(new CustomEvent("micron-multiline-armed", {
                    bubbles: true,
                    detail: { element: el, windowMs }
                }));
            } catch (_) {}
            const tid = setTimeout(() => disarm(el), windowMs + 16);
            armTimers.set(el, tid);
        };

        const onBlur = (e) => {
            if (e.target && e.target.tagName === "INPUT") disarm(e.target);
        };

        root.addEventListener("keydown", onKey);
        root.addEventListener("blur", onBlur, true);
        return () => {
            root.removeEventListener("keydown", onKey);
            root.removeEventListener("blur", onBlur, true);
        };
    }

    static enableMultiline(root, selectorOrPredicate, options = {}) {
        if (!root) return [];
        let candidates = [];
        if (typeof selectorOrPredicate === "string") {
            candidates = Array.from(root.querySelectorAll(selectorOrPredicate));
        } else if (typeof selectorOrPredicate === "function") {
            const all = Array.from(root.querySelectorAll('input[type="text"], input:not([type])'));
            for (const el of all) {
                const info = {
                    name: el.name,
                    value: (el.getAttribute("value") || el.value || ""),
                    size: el.size,
                    masked: (el.type === "password"),
                    element: el
                };
                const decision = selectorOrPredicate(info);
                if (decision) {
                    candidates.push(el);
                    el._micronUpgradeOpts = (typeof decision === "object") ? decision : null;
                }
            }
        } else if (Array.isArray(selectorOrPredicate)) {
            for (const item of selectorOrPredicate) {
                if (typeof item === "string") {
                    Array.from(root.querySelectorAll(`input[name="${item}"]`)).forEach(el => candidates.push(el));
                } else if (item && item.tagName) {
                    candidates.push(item);
                }
            }
        }

        const upgraded = [];
        for (const el of candidates) {
            if (el && el.type && el.type.toLowerCase() === "password") continue;
            const opts = el._micronUpgradeOpts || options;
            if (el._micronUpgradeOpts) delete el._micronUpgradeOpts;
            upgraded.push(MicronParser.upgradeInputToTextarea(el, opts));
        }
        return upgraded;
    }

    static bindPartials(root, fetcher, options = {}) {
        if (!root) return () => {};
        const elements = root.querySelectorAll(".Mu-partial:not([data-partial-bound])");
        const intervals = [];
        const controllers = new Map();

        const readPartial = (el) => {
            const url = el.getAttribute("data-partial-url");
            const destination = el.getAttribute("data-partial-destination") || url;
            const descriptor = el.getAttribute("data-partial-descriptor") || "";
            const refresh = parseFloat(el.getAttribute("data-partial-refresh") || "0");
            const fieldsAttr = el.getAttribute("data-partial-fields") || "";
            const fields = fieldsAttr.length > 0 ? fieldsAttr.split("|") : [];
            const id = el.getAttribute("data-partial-id");
            return { url, destination, descriptor, refresh, fields, id, element: el };
        };

        const apply = (el, result) => {
            if (result == null) return;
            if (typeof result === "string") {
                el.innerHTML = result;
            } else if (typeof Node !== "undefined" && result instanceof Node) {
                el.replaceChildren(result);
            } else if (result && typeof result.markup === "string") {
                el.innerHTML = result.markup;
            }
            el.setAttribute("data-partial-loaded", String(Date.now()));
            el.dispatchEvent(new CustomEvent("partial-loaded", { bubbles: true, detail: { result } }));
        };

        const load = async (el) => {
            const info = readPartial(el);
            if (!info.url) return;
            const previous = controllers.get(el);
            if (previous) previous.abort();
            const controller = (typeof AbortController !== "undefined") ? new AbortController() : null;
            if (controller) controllers.set(el, controller);
            el.dispatchEvent(new CustomEvent("partial-loading", { bubbles: true, detail: info }));
            try {
                const result = await fetcher({ ...info, signal: controller ? controller.signal : null });
                apply(el, result);
            } catch (e) {
                el.setAttribute("data-partial-error", String(e && e.message ? e.message : e));
                el.dispatchEvent(new CustomEvent("partial-error", { bubbles: true, detail: { error: e, info } }));
            } finally {
                if (controllers.get(el) === controller) controllers.delete(el);
            }
        };

        elements.forEach(el => {
            el.setAttribute("data-partial-bound", "1");
            if (options.lazy !== true) load(el);
            const refresh = parseFloat(el.getAttribute("data-partial-refresh") || "0");
            if (refresh >= 1) {
                const tid = setInterval(() => load(el), refresh * 1000);
                intervals.push(tid);
            }
        });

        const cleanup = () => {
            intervals.forEach(clearInterval);
            controllers.forEach(c => c.abort());
            controllers.clear();
            elements.forEach(el => el.removeAttribute("data-partial-bound"));
        };

        cleanup.reload = (predicate) => {
            elements.forEach(el => {
                if (!predicate || predicate(readPartial(el))) load(el);
            });
        };

        return cleanup;
    }

    splitAtSpaces(line) {
        let out = "";
        const wordArr = line.split(/(?<= )/g);
        for (const word of wordArr) {
            out += this.wrapWord(word);
        }
        return out;
    }

    wrapWord(word) {
        if (word.length === 0) return "";
        let needsWrap = false;
        for (let i = 0; i < word.length; i++) {
            const code = word.charCodeAt(i);
            if (code < 0x20 || code >= 0x7F || code === 0x26 || code === 0x3C || code === 0x3E) {
                needsWrap = true;
                break;
            }
        }
        if (!needsWrap) return word;

        if (!this._segmenter && typeof Intl !== "undefined" && Intl.Segmenter) {
            this._segmenter = new Intl.Segmenter();
        }
        const charArr = this._segmenter
            ? Array.from(this._segmenter.segment(word), s => s.segment)
            : Array.from(word);

        let inner = "";
        for (const ch of charArr) {
            const isComplex = ch.length > 1
                || ch.charCodeAt(0) < 0x20
                || ch.charCodeAt(0) >= 0x7F
                || ch === "&" || ch === "<" || ch === ">";
            if (isComplex) {
                inner += "<span class='Mu-mnt'>" + ch + "</span>";
            } else {
                inner += ch;
            }
        }
        return "<span class='Mu-mws'>" + inner + "</span>";
    }

    forceMonospace(line) {
        return this.wrapWord(line);
    }
}

export default MicronParser;
