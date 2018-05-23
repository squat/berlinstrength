import { routerReducer, RouterState } from 'react-router-redux';
import { combineReducers } from 'redux';

import { ManualScan, manualScan, Register, register, scan, ScanState, Upload, upload} from './scan';
import { Server, server } from './server';
import { SetSheet, setSheet, Sheet, sheets } from './sheets';
import { User, user } from './user';

export type All = {
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
