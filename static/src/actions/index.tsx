import { Howl } from 'howler';
import { push, RouterAction } from 'react-router-redux';
import * as redux from 'redux';
import { ThunkAction } from 'redux-thunk';

import { All } from '../reducers';
import { Client, expired } from '../reducers/client';
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
    SetClient = 'SetClient',
    SetManualScan = 'SetManualScan',
    SetRegister = 'SetRegister',
    SetSheet = 'SetSheet',
    SetUpload = 'SetUpload',
    ScanClient = 'ScanClient',
    ScanInFlight = 'ScanInFlight',
    ScanError = 'ScanError',
    ScanSearch = 'ScanSearch',
    ScanSeen = 'ScanSeen',
    SetUser = 'SetUser',
    SetWebSocket = 'SetWebSocket',
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
    id: string;
}

export interface ScanErrorAction extends Action {
    error: string;
}

export interface ScanInFlightAction extends Action {
    inFlight: boolean;
}

export interface ScanSearchAction extends Action {
    search: string;
}

export interface ScanSeenAction extends Action {
    seen: boolean;
    uuid: string;
}

export interface SetClientAction extends Action {
    client: Client;
    error: string;
    id: string;
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

export interface SetUploadAction extends Action {
    error: string;
    fileID: string;
    inFlight: boolean;
}

export interface SetWebSocketAction extends Action {
    state: boolean;
}

export const setUser = (email: string): SetUserAction => ({
    email,
    type: ActionType.SetUser,
});

export const webSocket = (raw: string): AsyncAction => {
    const json = JSON.parse(raw);
    return (dispatch: redux.Dispatch<All>): Promise<Action|RouterAction> => {
        if (json.hasOwnProperty('scanning')) {
            return Promise.resolve(dispatch(scanInFlight(json.scanning as boolean)));
        }
        if (json.hasOwnProperty('bsID')) {
            const c: Client = {
                bsID: json.bsID,
                debt: json.debt,
                email: json.email,
                expiration: json.expiration,
                id: json.id,
                name: json.name,
                photo: json.photo,
            };
            dispatch(setClient(json.bsID, false, c, ''));
            return Promise.resolve(dispatch(scanClient(c)))
                .then((): Action => dispatch(scanInFlight(false)));
        }
        dispatch(setClient('error', false, {} as Client, json.error));
        return Promise.resolve(dispatch(scanError(json.error)))
            .then((): Action => dispatch(scanInFlight(false)));
    };
};

export const setWebSocket = (state: boolean): SetWebSocketAction => ({
    state,
    type: ActionType.SetWebSocket,
});

export const scanError = (error: string): ScanErrorAction => {
    sound.play('err');
    return {
        error,
        type: ActionType.ScanError,
    };
};

export const scanClient = (client: Client): ScanClientAction => {
    if (client.debt || expired(client)) {
        sound.play('err');
    } else {
        sound.play('ok');
    }
    return {
        id: client.bsID,
        type: ActionType.ScanClient,
    };
};

export const scanInFlight = (inFlight: boolean): ScanInFlightAction => ({
    inFlight,
    type: ActionType.ScanInFlight,
});

export const scanSearch = (search: string): ScanSearchAction => ({
    search,
    type: ActionType.ScanSearch,
});

export const scanSeen = (uuid: string, seen: boolean): ScanSeenAction => ({
    seen,
    type: ActionType.ScanSeen,
    uuid,
});

type ScanResponse = {
    scanID: string
    sheetID: string
};

export const manualScan = (): ThunkAction<Promise<Action|RouterAction|null>, All, null> => {
    return (dispatch: redux.Dispatch<All>): Promise<Action|RouterAction|null> => {
        dispatch(setManualScan('', true, ''));
        return fetch(document.location.origin + '/api/scan', {credentials: 'include'})
            .then((response: Response): Promise<ScanResponse> => {
                if (!response.ok) {
                    throw Error(response.statusText);
                }
                return response.json();
            })
            .then((json: ScanResponse): Action => {
                return dispatch(setManualScan(json.scanID, false, ''));
            })
            .catch((error: Error): Action => {
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
            .then((response: Response): Promise<string|void> => {
                if (!response.ok) {
                    throw Error(response.statusText);
                }
                return Promise.resolve();
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

export const goHome = (): ThunkAction<Action, All, null> => {
    return (dispatch: redux.Dispatch<All>): Action => {
        dispatch(push('/'));
        dispatch(scanSearch(''));
        dispatch(setManualScan('', false, ''));
        return dispatch(setRegister(false, false, ''));
    };
};

export const clearRegistration = (): ThunkAction<Action, All, null> => {
    return (dispatch: redux.Dispatch<All>): Action => {
        dispatch(setManualScan('', false, ''));
        return dispatch(setRegister(false, false, ''));
    };
};

export const setUpload = (fileID: string, inFlight: boolean, error: string): SetUploadAction => ({
    error,
    fileID,
    inFlight,
    type: ActionType.SetUpload,
});

type UploadResponse = {
    fileID: string
};

export const requestUpload = (client: Client, photo: Blob|null): AsyncAction<SetUploadAction> => {
    return (dispatch: redux.Dispatch<All>): Promise<SetUploadAction> => {
        if (!photo) {
            return Promise.resolve(setUpload('', false, ''));
        }
        dispatch(setUpload('', true, ''));
        const upload = new FormData();
        upload.set('bsID', client.bsID);
        upload.set('data', photo);
        return fetch(document.location.origin + '/api/upload', {
            body: upload,
            credentials: 'include',
            method: 'POST'})
        .then((response: Response): Promise<UploadResponse> => {
            if (!response.ok) {
                throw Error(response.statusText);
            }
            return response.json();
        })
        .then((json: UploadResponse): SetUploadAction => dispatch(setUpload(json.fileID, false, '')))
        .catch((error: Error): SetUploadAction => dispatch(setUpload('', false, error.message)));
    };
};

export const requestRegister = (client: Client, photo: Blob|null, method: string = 'POST'): AsyncAction => {
    return (dispatch: redux.Dispatch<All>): Promise<Action|RouterAction> => {
        dispatch(setRegister(false, true, ''));
        return dispatch(requestUpload(client, photo)).then((upload: SetUploadAction): Promise<Response> => {
                if (upload.error !== '' ) {
                    throw Error(upload.error);
                }
                client.photo = upload.fileID;
                let url: string = document.location.origin + '/api/user';
                if (method === 'PUT') {
                    url += '/' + client.bsID;
                }
                return fetch(url, {
                    body: JSON.stringify(client),
                    credentials: 'include',
                    method,
                });
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

export const setClient = (id: string, inFlight: boolean, client: Client, error: string): SetClientAction => ({
    client,
    error,
    id,
    inFlight,
    type: ActionType.SetClient,
});

const shouldRequestClient = (getState: () => All, id: string): boolean => {
    const n = getState().clients.get(id);
    if (n && n.inFlight) {
        return false;
    }
    return true;
};

export const requestClient = (id: string): AsyncAction<void|Action> => {
    return (dispatch: redux.Dispatch<All>, getState: () => All): Promise<void|Action> => {
        if (shouldRequestClient(getState, id)) {
            dispatch(setClient(id, true, {} as Client, ''));
            return fetch(document.location.origin + '/api/user/' + id, {credentials: 'include'})
                .then((response: Response): Promise<Client> => {
                    if (!response.ok) {
                        throw Error(response.statusText);
                    }
                    return response.json();
                })
                .then((c: Client): Action => dispatch(setClient(id, false, c, '')))
            .catch((error: Error): Action => dispatch(setClient(id, false, {} as Client, error.message)));
        }
        return Promise.resolve();
    };
};
