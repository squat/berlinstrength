import * as React from 'react';
import { connect } from 'react-redux';
import * as redux from 'redux';

import { goHome } from '../actions';
import { All } from '../reducers';
import { Authenticated, Login, SheetsReady } from './login';
import { Search } from './search';

type DispatchProps = {
    dispatch: redux.Dispatch<redux.AnyAction>
};

const homeLink: React.SFC<DispatchProps & any> = ({dispatch, children, ...props}): JSX.Element => {
    const click = (e: React.MouseEvent<HTMLElement>) => {
        e.preventDefault();
        dispatch(goHome());
    };
    return <a href="/" {...props} onClick={click}>{children}</a>;
};

export const HomeLink = connect(undefined, (dispatch) => ({dispatch}))(homeLink);

export const Header: React.SFC = () => (
    <header>
        <div className="header-group--left"><h1><HomeLink>Berlin Strength</HomeLink></h1></div>
        <div className="header-group--middle"><Authenticated><SheetsReady><Search/></SheetsReady></Authenticated></div>
        <div className="header-group--right"><Login /></div>
    </header>
);

type ServerStatusProps = {
    state: boolean
};

const serverStatus: React.SFC<ServerStatusProps> = ({state}): JSX.Element => (
    <div className={'serverstatus serverstatus--' + (state ? 'up' : 'down')} />
);

const mapStateToProps = (state: All): ServerStatusProps => ({
    state: state.server.webSocket,
});

export const ServerStatus = connect(mapStateToProps)(serverStatus);
