import { createBrowserHistory as createHistory } from 'history';
import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Provider } from 'react-redux';
import { ConnectedRouter, push, routerMiddleware } from 'react-router-redux';
import { TransitionGroup } from 'react-transition-group';
import { applyMiddleware, bindActionCreators, createStore, Store } from 'redux';
import thunkMiddleware from 'redux-thunk';
import ReconnectingWebSocket from 'reconnecting-websocket';

import { addSheets, setClient, setSheet, setUser, setWebSocket, webSocket } from './actions';
import { Fade, LocationFadeRoutes } from './components/fade';
import { Header, ServerStatus } from './components/header';
import { Instructions } from './components/instructions';
import { Authenticated, AuthenticatedRoute } from './components/login';
import { ConnectedRegisterForm } from './components/register';
import { ScanView } from './components/scan';
import { SheetView } from './components/sheets';
import * as state from './reducers';
import { Client } from './reducers/client';
import { Sheet } from './reducers/sheets';
import { isAuthenticated } from './reducers/user';
import './style.css';

const history = createHistory();
const middleware = routerMiddleware(history);

const store: Store<state.All> = createStore(
        state.reducers,
        {} as state.All,
        applyMiddleware(
                    middleware,
                    thunkMiddleware,
                ),
);

if (window.hasOwnProperty('state')) {
        let sid: string = '';
        store.dispatch(addSheets((window as any).state.sheets as Sheet[]));
        store.dispatch(setUser((window as any).state.email as string));
        if ((window as any).state.sheetID !== '') {
                    sid = (window as any).state.sheetID as string;
                    store.dispatch(setSheet(sid, false));
                }
        if ((window as any).state.clientError as string !== '') {
                    store.dispatch(
                        setClient('error', false, {} as Client, (window as any).state.clientError as string),
                    );
                    store.dispatch(push('/scan/error'));
                }
        if (((window as any).state.client as Client).bsID !== '') {
                    const c: Client = (window as any).state.client as Client;
                    store.dispatch(setClient(c.bsID, false, c, ''));
                }
}

if (isAuthenticated(store.getState())) {
        const ws = new ReconnectingWebSocket(`ws${document.location.protocol.startsWith('https') ? 's' : ''}://`
                    + document.location.host + '/api/ws');
        ws.onmessage = (e): void => {
                    bindActionCreators({webSocket}, store.dispatch).webSocket(e.data);
                };
        ws.onopen = (): void => {
                    store.dispatch(setWebSocket(true));
                };
        ws.onerror = ws.onclose = (): void => {
                    store.dispatch(setWebSocket(false));
                };
}

ReactDom.render(
        <TransitionGroup appear={true}>
            <Fade>
                <Provider store={store}>
                    <ConnectedRouter history={history}>
                        <div>
                            <Header/>
                            <Authenticated><ServerStatus/></Authenticated>
                            <LocationFadeRoutes>
                                <AuthenticatedRoute redirect={false} exact={true} path="/" component={Instructions}/>
                                <AuthenticatedRoute path="/edit/:bsID" component={ConnectedRegisterForm}/>
                                <AuthenticatedRoute path="/register" component={ConnectedRegisterForm}/>
                                <AuthenticatedRoute path="/sheets" component={SheetView}/>
                                <AuthenticatedRoute path="/scan/:bsID" component={ScanView}/>
                            </LocationFadeRoutes>
                        </div>
                    </ConnectedRouter>
                </Provider>
            </Fade>
        </TransitionGroup>
        , document.getElementById('main'),
);
