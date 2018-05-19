import { Howl } from 'howler';
import { push, RouterAction } from 'react-router-redux';
import * as redux from 'redux';
import { ThunkAction } from 'redux-thunk';

import { All } from '../reducers';
import { Client, expired } from '../reducers/scan';
import { Sheet } from '../reducers/sheets';

const sound: Howl = new Howl({
    sprite: {
        err: [500, 500],
        ok: [0, 500],
    },
    src: ['/static/sounds.ogg'],
});

export enum ActionType {
    AddSheets = 'AddSheets',
    SetManualScan = 'SetManualScan',
    SetRegister = 'SetRegister',
    SetSheet = 'SetSheet',
    ScanClient = 'ScanClient',
    ScanInFlight = 'ScanInFlight',
    ScanError = 'ScanError',
    SetUser = 'SetUser',
}

export default interface Action {
    type: ActionType;
}

export interface SetUserAction extends Action {
    email: string;
}

export interface SheetsAction extends Action {
    sheets: Sheet[];
}

export interface SetSheetAction extends Action {
    id: string;
    inFlight: boolean;
}

export interface ScanClientAction extends Action {
    client: Client;
}

export interface ScanErrorAction extends Action {
    error: string;
}

export interface ScanInFlightAction extends Action {
    inFlight: boolean;
}

export interface SetManualScanAction extends Action {
    error: string;
    id: string;
    inFlight: boolean;
}

export interface SetRegisterAction extends Action {
    done: boolean;
    error: string;
    inFlight: boolean;
}

export const setUser = (email: string): SetUserAction => ({
    email,
    type: ActionType.SetUser,
});

export const websocket = (raw: string): AsyncAction => {
    const json = JSON.parse(raw);
    return (dispatch: redux.Dispatch<All>): Promise<Action|RouterAction> => {
        if (json.hasOwnProperty('scanning')) {
            return Promise.resolve(dispatch(scanInFlight(json.scanning as boolean)));
        }
        if (json.hasOwnProperty('bsID')) {
            return Promise.resolve(dispatch(scanClient({
                    bsID: json.bsID,
                    debt: json.debt,
                    email: json.email,
                    expiration: json.expiration,
                    id: json.id,
                    name: json.name,
                    photo: json.photo,
                })))
                .then((): RouterAction => dispatch(push('/scan/' + json.bsID)))
           .then((): Action => dispatch(scanInFlight(false)));
        }
        return Promise.resolve(dispatch(scanError(json.error)))
            .then((): Action => dispatch(scanInFlight(false)))
            .then((): RouterAction => dispatch(push('/scan/error')));
    };
};

export const scanError = (error: string): ScanErrorAction => {
    sound.play('err');
    return {
        error,
        type: ActionType.ScanError,
    };
};

export const scanClient = (client: Client): ScanClientAction => {
    if (client.debt || expired({client, error: '', time: Date()})) {
        sound.play('err');
    } else {
        sound.play('ok');
    }
    return {
        client,
        type: ActionType.ScanClient,
    };
};

export const scanInFlight = (inFlight: boolean): ScanInFlightAction => ({
    inFlight,
    type: ActionType.ScanInFlight,
});

type ScanResponse = {
    scanID: string
    sheetID: string
};

export const manualScan = (): ThunkAction<Promise<Action|RouterAction|null>, All, null> => {
    return (dispatch: redux.Dispatch<All>, getState: () => All): Promise<Action|RouterAction|null> => {
        const {router: r, manualScan: m} = getState();
        if ((r.location && r.location.pathname !== '/scan') || m.inFlight) {
            return Promise.resolve(null);
        }
        dispatch(setManualScan('', true, ''));
        return fetch(document.location.origin + '/api/scan', {credentials: 'include'})
            .then((response: Response): Promise<ScanResponse> => {
                if (!response.ok) {
                    throw Error(response.statusText);
                }
                return response.json();
            })
            .then((json: ScanResponse): Action => {
                dispatch(setManualScan(json.scanID, true, ''));
                dispatch(push('/register'));
                return dispatch(setManualScan(json.scanID, false, ''));
            })
            .catch((error: Error): Action => {
                dispatch(push('/'));
                return dispatch(setManualScan('', false, error.message));
            });
    };
};

export const setManualScan = (id: string, inFlight: boolean, error: string): SetManualScanAction => ({
    error,
    id,
    inFlight,
    type: ActionType.SetManualScan,
});

export const addSheets = (sheets: Sheet[]): SheetsAction => ({
    sheets,
    type: ActionType.AddSheets,
});

export const setSheet = (id: string, inFlight: boolean): SetSheetAction => ({
    id,
    inFlight,
    type: ActionType.SetSheet,
});

type AsyncAction<T= Action|RouterAction> = (dispatch: redux.Dispatch<All>, getState: () => All) => Promise<T>;

export const requestSetSheet = (id: string): AsyncAction => {
    return (dispatch: redux.Dispatch<All>): Promise<Action|RouterAction> => {
        dispatch(setSheet(id, true));
        return fetch(document.location.origin + '/api/sheet/' + id, {credentials: 'include', method: 'POST'})
            .then((response: Response): Promise<string> => {
                if (!response.ok) {
                    throw Error(response.statusText);
                }
                return response.json();
            })
            .then((): Action => dispatch(setSheet(id, false)))
            .catch((): Action => dispatch(setSheet('', false)))
            .then((): RouterAction => dispatch(push('/')));
    };
};

export const logout = (): AsyncAction => {
    return (dispatch: redux.Dispatch<All>): Promise<Action> => {
        return fetch(document.location.origin + '/logout', {credentials: 'include', method: 'POST'})
            .then((): Action => dispatch(setUser('')));
    };
};

export const setRegister = (done: boolean, inFlight: boolean, error: string): SetRegisterAction => ({
    done,
    error,
    inFlight,
    type: ActionType.SetRegister,
});

export const stopRegister = (): ThunkAction<Action, All, null> => {
    return (dispatch: redux.Dispatch<All>): Action => {
        dispatch(push('/'));
        dispatch(setManualScan('', false, ''));
        return dispatch(setRegister(false, false, ''));
    };
};

type UploadResponse = {
    fileID: string
};

export const requestRegister = (client: Client, photo: Blob|null): AsyncAction => {
    return (dispatch: redux.Dispatch<All>): Promise<Action|RouterAction> => {
        dispatch(setRegister(false, true, ''));
        let p: Promise<UploadResponse>;
        if (photo) {
            const upload = new FormData();
            upload.set('bsID', client.bsID);
            upload.set('data', photo);
            p = fetch(document.location.origin + '/api/upload', {
                body: upload,
                credentials: 'include',
                method: 'POST'})
            .then((response: Response): Promise<UploadResponse> => {
                if (!response.ok) {
                    throw Error(response.statusText);
                }
                return response.json();
            });
        } else {
            p = Promise.resolve({fileID: ''});
        }
        return p.then((json: UploadResponse): Promise<Response> => {
                client.photo = json.fileID;
                return fetch(document.location.origin + '/api/register', {
                    body: JSON.stringify(client),
                    credentials: 'include',
                    method: 'POST'});
            })
            .then((response: Response): Promise<string> => {
                if (!response.ok) {
                    throw Error(response.statusText);
                }
                return Promise.resolve(client.id);
            })
            .then((): Action => dispatch(setRegister(true, false, '')))
            .catch((error: Error): Action => dispatch(setRegister(true, false, error.message)));
    };
};
