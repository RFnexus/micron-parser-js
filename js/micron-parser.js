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

    constructor(darkTheme = true) {
        this.darkTheme = darkTheme;
        this.DEFAULT_FG_DARK  = "ddd";
        this.DEFAULT_FG_LIGHT = "222";
        this.DEFAULT_BG = "default";

        this.SELECTED_STYLES = null;

        this.STYLES_DARK = {
            "plain":    { fg: this.DEFAULT_FG_DARK, bg: this.DEFAULT_BG, bold: false, underline: false, italic: false },
            "heading1": { fg: "222", bg: "bbb", bold: false, underline: false, italic: false },
            "heading2": { fg: "111", bg: "999", bold: false, underline: false, italic: false },
            "heading3": { fg: "000", bg: "777", bold: false, underline: false, italic: false }
        };

        this.STYLES_LIGHT = {
            "plain":    { fg: this.DEFAULT_FG_LIGHT, bg: this.DEFAULT_BG, bold: false, underline: false, italic: false },
            "heading1": { fg: "000", bg: "777", bold: false, underline: false, italic: false },
            "heading2": { fg: "111", bg: "aaa", bold: false, underline: false, italic: false },
            "heading3": { fg: "222", bg: "ccc", bold: false, underline: false, italic: false }
        };

        if (this.darkTheme) {
            this.SELECTED_STYLES = this.STYLES_DARK;
        } else {
            this.SELECTED_STYLES = this.STYLES_LIGHT;
        }
    }

    static formatNomadnetworkUrl(url) {
        return `nomadnetwork://${url}`;
    }

    convertMicronToHtml(markup) {
        let html = "";

        let state = {
            literal: false,
            depth: 0,
            fg_color: this.SELECTED_STYLES.plain.fg,
            bg_color: this.DEFAULT_BG,
            formatting: {
                bold: false,
                underline: false,
                italic: false,
                strikethrough: false
            },
            default_align: "left",
            align: "left",
            radio_groups: {}
        };

        const lines = markup.split("\n");

        for (let line of lines) {
            const lineOutput = this.parseLine(line, state);
            if (lineOutput && lineOutput.length > 0) {
                for (let el of lineOutput) {
                    html += el.outerHTML;
                }
            } else {
                html += "<br>";
            }
        }

        return html;
    }

    parseToHtml(markup) {
        // Create a fragment to hold all the Micron output
        const fragment = document.createDocumentFragment();

        let state = {
            literal: false,
            depth: 0,
            fg_color: this.SELECTED_STYLES.plain.fg,
            bg_color: this.DEFAULT_BG,
            formatting: {
                bold: false,
                underline: false,
                italic: false,
                strikethrough: false
            },
            default_align: "left",
            align: "left",
            radio_groups: {}
        };

        const lines = markup.split("\n");

        for (let line of lines) {
            const lineOutput = this.parseLine(line, state);
            if (lineOutput && lineOutput.length > 0) {
                for (let el of lineOutput) {
                    fragment.appendChild(el);
                }
            } else {
                fragment.appendChild(document.createElement("br"));
            }
        }

        return fragment;
    }

    parseLine(line, state) {
        if (line.length > 0) {
            // Check literals toggle
            if (line === "`=") {
                state.literal = !state.literal;
                return null;
            }


            if (!state.literal) {
                // Comments
                if (line[0] === "#") {
                    return null;
                }

                // Reset section depth
                if (line[0] === "<") {
                    state.depth = 0;
                    return this.parseLine(line.slice(1), state);
                }

                // Section headings
                if (line[0] === ">") {
                    let i = 0;
                    while (i < line.length && line[i] === ">") {
                        i++;
                    }
                    state.depth = i;
                    let headingLine = line.slice(i);

                    if (headingLine.length > 0) {
                        // apply heading style if it exists
                        let style = null;
                        let wanted_style = "heading" + i;
                        if (this.SELECTED_STYLES[wanted_style]) {
                            style = this.SELECTED_STYLES[wanted_style];
                        } else {
                            style = this.SELECTED_STYLES.plain;
                        }

                        const latched_style = this.stateToStyle(state);
                        this.styleToState(style, state);

                        let outputParts = this.makeOutput(state, headingLine);
                        this.styleToState(latched_style, state);

                        // make outputParts full container width
                        if (outputParts && outputParts.length > 0) {
                            const outerDiv = document.createElement("div");
                            outerDiv.style.display = "block";
                            outerDiv.style.width = "100%";
                            this.applyStyleToElement(outerDiv, style);

                            const innerDiv = document.createElement("div");
                            this.applySectionIndent(innerDiv, state);

                            this.appendOutput(innerDiv, outputParts, state);
                            outerDiv.appendChild(innerDiv);

                            return [outerDiv];
                        }
                        // wrap in a heading container
                        if (outputParts && outputParts.length > 0) {
                            const div = document.createElement("div");
                            this.applyAlignment(div, state);
                            this.applySectionIndent(div, state);
                            // merge text nodes
                            this.appendOutput(div, outputParts, state);
                            return [div];
                        } else {
                            return null;
                        }
                    } else {
                        return null;
                    }
                }

                // horizontal dividers
                if (line[0] === "-") {
                // if the line is  just "-", do a normal <hr>
                if (line.length === 1) {
                    const hr = document.createElement("hr");
                    this.applySectionIndent(hr, state);
                    return [hr];
                } else {
                    // if second char given
                    const dividerChar = this.forceMonospace(line[1]);  // use the following character for creating the divider
                    const repeated = dividerChar.repeat(250);

                    const div = document.createElement("div");
                    div.style.whiteSpace = "pre";   // needs to not wrap and ignore container formatting
                    div.textContent = repeated;
                    div.style.display = "block";
                    div.style.width   = "100%";
                    div.style.whiteSpace  = "nowrap";
                    div.style.overflow    = "hidden";
                    div.style.margin      = "0.5em 0";
                    this.applySectionIndent(div, state);

                    return [div];
                }
            }

            }

            let outputParts = this.makeOutput(state, line);
            if (outputParts) {
                // outputParts can contain text (tuple) and special objects (fields/checkbox)
                // construct a single line container
                let container = document.createElement("div");
                this.applyAlignment(container, state);
                this.applySectionIndent(container, state);
                this.appendOutput(container, outputParts, state);
                return [container];
            } else {
                // Just empty line
                return [document.createElement("br")];
            }

        } else {
            // Empty line
            return [document.createElement("br")];
        }
    }

    applyAlignment(el, state) {
        // use CSS text-align for alignment
        el.style.textAlign = state.align || "left";
    }

    applySectionIndent(el, state) {
        // indent by state.depth
        let indent = (state.depth - 1) * 2;
        if (indent > 0) {
            el.style.marginLeft = (indent * 10) + "px";
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
                    this.applyStyleToElement(currentSpan, styleSpec);
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
                    this.applyStyleToElement(input, this.styleFromState(p.style));
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
                    this.applyStyleToElement(label, this.styleFromState(p.style));
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
                    this.applyStyleToElement(label, this.styleFromState(p.style));
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

                        a.setAttribute("onclick", `event.preventDefault(); onNodePageUrlClick('${directURL}', '${fieldStr}', false, false)`);
                    } else {
                        // no fields or request variables, just handle the direct URL
                        a.setAttribute("onclick", `event.preventDefault(); onNodePageUrlClick('${directURL}', null, false, false)`);
                    }

                    a.innerHTML = p.label;
                    this.applyStyleToElement(a, this.styleFromState(p.style));
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

    applyStyleToElement(el, style) {
        if (!style) return;
        // convert style fg/bg to colors
        let fgColor = this.colorToCss(style.fg);
        let bgColor = this.colorToCss(style.bg);

        if (fgColor && fgColor !== "default") {
            el.style.color = fgColor;
        }
        if (bgColor && bgColor !== "default") {
            el.style.backgroundColor = bgColor;
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
            let val = parseInt(c.slice(1),10);
            if (isNaN(val)) val = 50;
            // map 0-99 scale to a gray hex
            let h = Math.floor(val*2.55).toString(16).padStart(2,'0');
            return "#" + h + h + h;
        }

        // fallback: just return a known CSS color or tailwind class if not known
        return null;
    }

makeOutput(state, line) {
    if (state.literal) {
        // literal mode: output as is, except if `= line
        if (line === "\\`=") {
            line = "`=";
        }
        return [[this.stateToStyle(state), line]];
    }

    let output = [];
    let part = "";
    let mode = "text";
    let escape = false;
    let skip = 0;

    const flushPart = () => {
        if (part.length > 0) {
            output.push([this.stateToStyle(state), this.forceMonospace(part)]);
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
                    // next 3 chars => fg color
                    if (line.length >= i + 4) {
                        let color = line.substr(i+1, 3);
                        state.fg_color = color;
                        skip = 3;
                    }
                    break;
                case 'f':
                    // reset fg
                    state.fg_color = this.SELECTED_STYLES.plain.fg;
                    break;

                case 'B':
                    // next 3 chars => bg color
                    if (line.length >= i + 4) {
                        let color = line.substr(i+1, 3);
                        state.bg_color = color;
                        skip = 3;
                    }
                    break;
                case 'b':
                    // reset bg
                    state.bg_color = this.DEFAULT_BG;
                    break;
                case '`':
                    state.formatting.bold = false;
                    state.formatting.underline = false;
                    state.formatting.italic = false;
                    state.fg_color = this.SELECTED_STYLES.plain.fg;
                    state.bg_color = this.DEFAULT_BG;
                    state.align    = state.default_align;
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
            }
            else if (c === '\\') {
                escape = true;
            }
            else if (c === '`') {
                if (i + 1 < line.length && line[i+1] === '`') {
                    flushPart();
                    state.formatting.bold = false;
                    state.formatting.underline = false;
                    state.formatting.italic = false;
                    state.fg_color = this.SELECTED_STYLES.plain.fg;
                    state.bg_color = this.DEFAULT_BG;
                    state.align = state.default_align;
                    i += 2;
                    continue;
                } else {
                    flushPart();
                    mode = "formatting";
                    i++;
                    continue;
                }
            }
            else if (c === '[') {
                flushPart();
                let linkDataText = this.parseLink(line, i, state);
                if (linkDataText) {
                    output.push(linkDataText.obj);
                    i += linkDataText.skip;
                    continue;
                } else {
                    // not a link
                    part += '[';
                }
            }
            else {
                // normal text char
                part += c;
            }
            i++;
        }
    }
    // end of line
    if (part.length > 0) {
        output.push([this.stateToStyle(state), this.forceMonospace(part)]);
    }

    return (output.length > 0) ? output : null;
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
                field_flags = field_flags.replace('^','');
            } else if (field_flags.includes('?')) {
                field_type = "checkbox";
                field_flags = field_flags.replace('?','');
            } else if (field_flags.includes('!')) {
                field_masked = true;
                field_flags = field_flags.replace('!','');
            }

            if (field_flags.length > 0) {
                let w = parseInt(field_flags,10);
                if (!isNaN(w)) {
                    field_width = Math.min(w,256);
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

        let field_data = line.substring(backtick_pos+1, field_end);
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

        let skip = (field_end - startIndex) + 2;
        return { obj: obj, skip: skip };
    }

    parseLink(line, startIndex, state) {
        let endpos = line.indexOf(']', startIndex);
        if (endpos === -1) return null;

        let link_data = line.substring(startIndex+1, endpos);
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
        link_label = this.forceMonospace(link_label);

        let style = this.stateToStyle(state);
        let obj = {
            type: "link",
            url: link_url,
            label: link_label,
            fields: (link_fields ? link_fields.split("|") : []),
            style: style
        };

        let skip = (endpos - startIndex) + 2;
        return { obj: obj, skip: skip };
    }

    forceMonospace(line) {
        let out = "";
        let lineArr = line.split("");
        for (let char of lineArr) {
            out += "<span class='nodeText'>" + char + "</span>";
        }
        out += "<br>";
        return out;
    }
}

export default MicronParser;
