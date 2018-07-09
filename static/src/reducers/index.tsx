import { routerReducer, RouterState } from 'react-router-redux';
import { combineReducers } from 'redux';

import { clients, ClientState, Register, register, Upload, upload } from './client';
import { ManualScan, manualScan, scan, ScanState } from './scan';
import { Server, server } from './server';
import { SetSheet, setSheet, Sheet, sheets } from './sheets';
import { User, user } from './user';

export type All = {
    clients: ClientState
    manualScan: ManualScan
    register: Register
    router: RouterState
    scan: ScanState
    server: Server
    setSheet: SetSheet
    sheets: Sheet[]
    upload: Upload
    user: User
};

export const reducers = combineReducers<All>({
    clients,
    manualScan,
    register,
    router: routerReducer,
    scan,
    server,
    setSheet,
    sheets,
    upload,
    user,
});
