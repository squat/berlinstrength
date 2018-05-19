import { routerReducer, RouterState } from 'react-router-redux';
import { combineReducers } from 'redux';

import { ManualScan, manualScan, Register, register, scan, ScanState } from './scan';
import { SetSheet, setSheet, Sheet, sheets } from './sheets';
import { User, user } from './user';

export type All = {
    manualScan: ManualScan
    register: Register
    router: RouterState
    scan: ScanState
    setSheet: SetSheet
    sheets: Sheet[]
    user: User
};

export const reducers = combineReducers<All>({
    manualScan,
    register,
    router: routerReducer,
    scan,
    setSheet,
    sheets,
    user,
});
