import ace from 'brace';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {equals} from 'ramda';
// Default ACE Modules
import 'brace/theme/cobalt';
import 'brace/ext/spellcheck';
import 'brace/ext/searchbox';
import 'brace/ext/keybinding_menu';
import 'brace/ext/settings_menu';
import 'brace/ext/whitespace';
// Custom ACE Modules
import './ext/language_tools.js';
import './ext/mode/folding_cstyle.js';
import './ext/mode/matching_brace_outdent.js';
import './ext/mode/clickhouse_FoldMode.js';
import './ext/mode/clickhouse_highlight_rules.js';
import './ext/mode-clickhouse.js';

const { Range } = ace.acequire('ace/range');
import { editorOptions, editorEvents,debounce } from './editorOptions.js';

export default class ReactAce extends Component {
    // Source https://github.com/securingsincity/react-ace
    constructor(props) {
        super(props);
        editorEvents.forEach(method => {
            this[method] = this[method].bind(this);
        });
        this.debounce=debounce;
    }

    insertWordInEditor()
    {
        // const editor = $scope.vars.currentTab.editor;
        // const position = editor.getCursorPosition();
        // position.column += word.length;
        // editor.clearSelection();
        // editor.insert(word);
        // $scope.vars.currentTab.sql = editor.getValue();
        // $timeout(() => {
        //     editor.focus();
        //     editor.moveCursorToPosition(position);
        // });
    }


    /**
     * @param DatabaseStructure ds
     * @param String dataBaseName
     */
    updateDataStructure(ds,dataBaseName)
    {
        if (!ds || !ds.constructor) return;
        if (ds.constructor.name !== 'DatabaseStructure') return;
        console.info('Ace:updateDataStructure',dataBaseName,ds);
        // ------------------------------- -----------------------------------
        let $aceJSRules = ds.getForAceJS(dataBaseName);
        // update completions
        $aceJSRules.builtinFunctions.map((v)=> { // ---------- builtinFunctions ----------
            this.editor.session.$mode.$highlightRules.addCompletionsFunctions(v);
        });
        $aceJSRules.fieldsList.map((v)=>{ // ---------- fieldsList ----------
            this.editor.session.$mode.$highlightRules.addCompletionsTableFiled(v);
        });
        $aceJSRules.dictionaries.map((v)=>{ // ---------- dictionaries ----------
            this.editor.session.$mode.$highlightRules.addCompletionsDictionaries(v);
        });
        this.editor.session.$mode.$highlightRules.addArrayCompletions($aceJSRules.tables, '[table]','table');

        // update keywords
        // 'markup.bold': listOfTables,          // dynamic
        // 'support.function': builtinFunctions, // dynamic
        // 'markup.heading': $_fields.join('|')  // dynamic

        this.editor.session.$mode.$highlightRules.setKeywords(
            {
                'support.class' : 'DBTABLE|DB2TABLE2', // green [DB.TABLE]
                'markup.italic': 'fuck|foo|bprpw|bnoorw', // functionNames
                'variable.parameter':'field2|fiels5|field1',
                'markup.heading':'var1|var2|var3',
                'markup.underline': 'underline|underline1|underline2|underline3',
                'support.type' : 'fack|baz|BPRPQ|BPPPP',
                'keyword.other' : 'deprecated|deprecated1|deprecated2',

            }
        );
        console.info('this.editor.session.$mode.$highlightRules.getKeywords()',this.editor.session.$mode.$highlightRules.getKeywords());
        console.info('this.editor.session.$mode.$highlightRules.getRules()',this.editor.session.$mode.$highlightRules.getRules());

        // // ---------- LOAD vars ----------
        // let vars=Variables.getCompletions();
        // let snip=Snippets.getCompletions();
        // editor.session.$mode.$highlightRules.addArrayCompletions(vars, '[var]','var');
        // editor.session.$mode.$highlightRules.addArrayCompletions(snip, '[snippet]','snippet');
        //
        // force rehighlight whole document
        this.editor.session.bgTokenizer.start(0);

    }


    componentDidMount() {
        const {
            className,
            onBeforeLoad,
            onValidate,
            mode,
            focus,
            theme,
            fontSize,
            value,
            defaultValue,
            cursorStart,
            showGutter,
            wrapEnabled,
            showPrintMargin,
            scrollMargin = [ 0, 0, 0, 0],
            keyboardHandler,
            onLoad,
            commands,
            annotations,
            markers,
            dataStructure,
            currentDatabaseName
        } = this.props;

        this.editor = ace.edit(this.refEditor);

        if (onBeforeLoad) {
            onBeforeLoad(ace);
        }

        const editorProps = Object.keys(this.props.editorProps);
        for (let i = 0; i < editorProps.length; i++) {
            this.editor[editorProps[i]] = this.props.editorProps[editorProps[i]];
        }
        if (this.props.debounceChangePeriod) {
            this.onChange = this.debounce(this.onChange, this.props.debounceChangePeriod);
        }
        this.editor.renderer.setScrollMargin(scrollMargin[0], scrollMargin[1], scrollMargin[2], scrollMargin[3]);


        this.editor.$blockScrolling = Infinity;



        // this.editor.getSession().setMode(mode);
        this.editor.getSession().setMode({path:`ace/mode/${mode}`, v: Date.now()});

        this.editor.setTheme(`ace/theme/${theme}`);
        this.editor.setFontSize(fontSize);
        this.editor.getSession().setValue(!defaultValue ? value : defaultValue, cursorStart);
        this.editor.navigateFileEnd();
        this.editor.renderer.setShowGutter(showGutter);
        this.editor.getSession().setUseWrapMode(wrapEnabled);
        this.editor.setShowPrintMargin(showPrintMargin);

        this.editor.on('focus', this.onFocus);
        this.editor.on('blur', this.onBlur);
        this.editor.on('copy', this.onCopy);
        this.editor.on('paste', this.onPaste);
        this.editor.on('change', this.onChange);
        this.editor.on('input', this.onInput);

        this.editor.getSession().selection.on('changeSelection', this.onSelectionChange);
        this.editor.getSession().selection.on('changeCursor', this.onCursorChange);

        if (onValidate) {
            this.editor.getSession().on('changeAnnotation', () => {
                const annotations = this.editor.getSession().getAnnotations();
                this.props.onValidate(annotations);
            });
        }

        this.editor.session.on('changeScrollTop', this.onScroll);
        this.editor.getSession().setAnnotations(annotations || []);

        if(markers && markers.length > 0){
            this.handleMarkers(markers);
        }

        // get a list of possible options to avoid 'misspelled option errors'
        const availableOptions = this.editor.$options;
        for (let i = 0; i < editorOptions.length; i++) {
            const option = editorOptions[i];
            if (availableOptions.hasOwnProperty(option)) {
                this.editor.setOption(option, this.props[option]);
            } else if (this.props[option]) {
                console.warn(`ReactAce: editor option ${option} was activated but not found. Did you need to import a related tool or did you possibly mispell the option?`);
            }
        }
        this.handleOptions(this.props);

        // DataStructure
        this.updateDataStructure(this.props.dataStructure,this.props.currentDatabaseName);

        if (Array.isArray(commands)) {
            commands.forEach((command) => {
                if(typeof command.exec == 'string') {
                    this.editor.commands.bindKey(command.bindKey, command.exec);
                }
                else {
                    this.editor.commands.addCommand(command);
                }
            });
        }

        if (keyboardHandler) {
            this.editor.setKeyboardHandler('ace/keyboard/' + keyboardHandler);
        }

        if (className) {
            this.refEditor.className += ' ' + className;
        }

        if (focus) {
            this.editor.focus();
        }

        if (onLoad) {
            onLoad(this.editor);
        }

        this.editor.resize();
    }

    componentWillReceiveProps(nextProps) {
        const oldProps = this.props;

        for (let i = 0; i < editorOptions.length; i++) {
            const option = editorOptions[i];
            if (nextProps[option] !== oldProps[option]) {
                this.editor.setOption(option, nextProps[option]);
            }
        }

        if (nextProps.className !== oldProps.className) {
            let appliedClasses = this.refEditor.className;
            let appliedClassesArray = appliedClasses.trim().split(' ');
            let oldClassesArray = oldProps.className.trim().split(' ');
            oldClassesArray.forEach((oldClass) => {
                let index = appliedClassesArray.indexOf(oldClass);
                appliedClassesArray.splice(index, 1);
            });
            this.refEditor.className = ' ' + nextProps.className + ' ' + appliedClassesArray.join(' ');
        }

        // First process editor value, as it may create a new session (see issue #300)
        if (this.editor && this.editor.getValue() !== nextProps.value) {
            // editor.setValue is a synchronous function call, change event is emitted before setValue return.
            this.silent = true;
            const pos = this.editor.session.selection.toJSON();
            this.editor.setValue(nextProps.value, nextProps.cursorStart);
            this.editor.session.selection.fromJSON(pos);
            this.silent = false;
        }

        if (nextProps.mode !== oldProps.mode) {
            this.editor.getSession().setMode('ace/mode/' + nextProps.mode);
        }
        if (nextProps.theme !== oldProps.theme) {
            this.editor.setTheme('ace/theme/' + nextProps.theme);
        }
        if (nextProps.keyboardHandler !== oldProps.keyboardHandler) {
            if (nextProps.keyboardHandler) {
                this.editor.setKeyboardHandler('ace/keyboard/' + nextProps.keyboardHandler);
            } else {
                this.editor.setKeyboardHandler(null);
            }
        }
        if (nextProps.fontSize !== oldProps.fontSize) {
            this.editor.setFontSize(nextProps.fontSize);
        }
        if (nextProps.wrapEnabled !== oldProps.wrapEnabled) {
            this.editor.getSession().setUseWrapMode(nextProps.wrapEnabled);
        }
        if (nextProps.showPrintMargin !== oldProps.showPrintMargin) {
            this.editor.setShowPrintMargin(nextProps.showPrintMargin);
        }
        if (nextProps.showGutter !== oldProps.showGutter) {
            this.editor.renderer.setShowGutter(nextProps.showGutter);
        }
        if (!equals(nextProps.setOptions, oldProps.setOptions)) {
            this.handleOptions(nextProps);
        }

        // DataStructure & currentDatabaseName
        if (!equals(nextProps.dataStructure, oldProps.dataStructure) || !equals(nextProps.currentDatabaseName, oldProps.currentDatabaseName)) {
            this.updateDataStructure(nextProps.dataStructure,nextProps.currentDatabaseName);
        }

        if (!equals(nextProps.annotations, oldProps.annotations)) {
            this.editor.getSession().setAnnotations(nextProps.annotations || []);
        }
        if (!equals(nextProps.markers, oldProps.markers) && (Array.isArray(nextProps.markers))) {
            this.handleMarkers(nextProps.markers);
        }

        // this doesn't look like it works at all....
        if (!equals(nextProps.scrollMargin, oldProps.scrollMargin)) {
            this.handleScrollMargins(nextProps.scrollMargin);
        }

        if (nextProps.focus && !oldProps.focus) {
            this.editor.focus();
        }

    }

    componentDidUpdate(prevProps) {
        if(prevProps.height !== this.props.height || prevProps.width !== this.props.width){
            this.editor.resize();
        }
    }

    handleScrollMargins(margins = [0, 0, 0, 0]) {
        this.editor.renderer.setScrollMargins(margins[0], margins[1], margins[2], margins[3]);
    }

    componentWillUnmount() {
        this.editor.destroy();
        this.editor = null;
    }

    onChange(event) {
        if (this.props.onChange && !this.silent) {
            const value = this.editor.getValue();
            this.props.onChange(value, event);
        }
    }

    onSelectionChange(event) {
        if (this.props.onSelectionChange) {
            const value = this.editor.getSelection();
            this.props.onSelectionChange(value, event);
        }
    }
    onCursorChange(event) {
        if(this.props.onCursorChange) {
            const value = this.editor.getSelection();
            this.props.onCursorChange(value, event);
        }
    }
    onInput(event) {
        if (this.props.onInput) {
            this.props.onInput(event);
        }
    }
    onFocus(event) {
        if (this.props.onFocus) {
            this.props.onFocus(event);
        }
    }

    onBlur(event) {
        if (this.props.onBlur) {
            this.props.onBlur(event,this.editor);
        }
    }

    onCopy(text) {
        if (this.props.onCopy) {
            this.props.onCopy(text);
        }
    }

    onPaste(text) {
        if (this.props.onPaste) {
            this.props.onPaste(text);
        }
    }

    onScroll() {
        if (this.props.onScroll) {
            this.props.onScroll(this.editor);
        }
    }

    handleOptions(props) {
        const setOptions = Object.keys(props.setOptions);
        for (let y = 0; y < setOptions.length; y++) {
            this.editor.setOption(setOptions[y], props.setOptions[setOptions[y]]);
        }
    }

    handleMarkers(markers) {
        // remove foreground markers
        let currentMarkers = this.editor.getSession().getMarkers(true);
        for (const i in currentMarkers) {
            if (currentMarkers.hasOwnProperty(i)) {
                this.editor.getSession().removeMarker(currentMarkers[i].id);
            }
        }
        // remove background markers
        currentMarkers = this.editor.getSession().getMarkers(false);
        for (const i in currentMarkers) {
            if (currentMarkers.hasOwnProperty(i)) {
                this.editor.getSession().removeMarker(currentMarkers[i].id);
            }
        }
        // add new markers
        markers.forEach(({ startRow, startCol, endRow, endCol, className, type, inFront = false }) => {
            const range = new Range(startRow, startCol, endRow, endCol);
            this.editor.getSession().addMarker(range, className, type, inFront);
        });
    }

    updateRef(item) {
        this.refEditor = item;
    }

    render() {
        const { name, width, height, style } = this.props;
        const divStyle = { width, height, ...style };
        return (
            <div ref={this.updateRef}
                id={name}
                style={divStyle}
            >
            </div>
        );
    }
}

ReactAce.propTypes = {
    mode: PropTypes.string,
    focus: PropTypes.bool,
    theme: PropTypes.string,
    name: PropTypes.string,
    className: PropTypes.string,
    height: PropTypes.string,
    width: PropTypes.string,
    fontSize: PropTypes.oneOfType([
        PropTypes.number,
        PropTypes.string,
    ]),
    showGutter: PropTypes.bool,
    onChange: PropTypes.func,
    onCopy: PropTypes.func,
    onPaste: PropTypes.func,
    onFocus: PropTypes.func,
    onInput: PropTypes.func,
    onBlur: PropTypes.func,
    onScroll: PropTypes.func,
    value: PropTypes.string,
    defaultValue: PropTypes.string,
    onLoad: PropTypes.func,
    onSelectionChange: PropTypes.func,
    onCursorChange: PropTypes.func,
    onBeforeLoad: PropTypes.func,
    onValidate: PropTypes.func,
    minLines: PropTypes.number,
    maxLines: PropTypes.number,
    readOnly: PropTypes.bool,
    highlightActiveLine: PropTypes.bool,
    tabSize: PropTypes.number,
    showPrintMargin: PropTypes.bool,
    cursorStart: PropTypes.number,
    debounceChangePeriod: PropTypes.number,
    editorProps: PropTypes.object,
    setOptions: PropTypes.object,
    style: PropTypes.object,
    scrollMargin: PropTypes.array,
    annotations: PropTypes.array,
    markers: PropTypes.array,
    keyboardHandler: PropTypes.string,
    currentDatabaseName: PropTypes.string,
    wrapEnabled: PropTypes.bool,
    enableBasicAutocompletion: PropTypes.oneOfType([
        PropTypes.bool,
        PropTypes.array,
    ]),
    enableLiveAutocompletion: PropTypes.oneOfType([
        PropTypes.bool,
        PropTypes.array,
    ]),
    commands: PropTypes.array,
};

ReactAce.defaultProps = {
    name: 'brace-editor',
    focus: false,
    mode: '',
    theme: '',
    height: '500px',
    width: '500px',
    value: '',
    fontSize: 14,
    showGutter: true,
    onChange: null,
    onPaste: null,
    onLoad: null,
    onScroll: null,
    minLines: null,
    maxLines: null,
    readOnly: false,
    highlightActiveLine: true,
    showPrintMargin: true,
    tabSize: 4,
    cursorStart: 1,
    editorProps: {},
    style: {},
    scrollMargin: [ 0, 0, 0, 0],
    setOptions: {},
    wrapEnabled: false,
    enableBasicAutocompletion: true,
    enableLiveAutocompletion: true,
    behavioursEnabled:true ,
    wrapBehavioursEnabled:true ,
    highlightSelectedWord:true ,
    liveAutocompletionDelay: 500,
    liveAutocompletionThreshold: 2
};