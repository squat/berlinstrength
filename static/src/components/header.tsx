import * as React from 'react';
import { connect } from 'react-redux';

import { All } from '../reducers';
import { Login } from './login';

export const Header: React.SFC = () => (
    <header>
        <h1>Berlin Strength</h1>
        <Login />
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
