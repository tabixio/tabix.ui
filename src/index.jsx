import React from 'react';
import ReactDOM from 'react-dom';
import App from './App.jsx';
import { Provider } from 'react-redux';
import configureStore from './store';
import createHistory from 'history/createBrowserHistory';

import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';
import 'react-flexbox-grid/dist/react-flexbox-grid.css';
import './styles/index.less';
import { FocusStyleManager } from "@blueprintjs/core";

const history = createHistory();
const store = configureStore(history);
// Enable behavior which hides focus styles during mouse interaction.
FocusStyleManager.onlyShowFocusOnTabs();

ReactDOM.render(
    <Provider store={store}>
        <App history={history} />
    </Provider>,
    document.getElementById('root')
);