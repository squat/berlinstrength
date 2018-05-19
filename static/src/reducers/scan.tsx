import Action, {
    ActionType,
    ScanClientAction,
    ScanErrorAction,
    ScanInFlightAction,
    SetManualScanAction,
    SetRegisterAction,
} from '../actions';

export type Scan = {
    client: Client
    error: string
    time: string
};

export type ManualScan = {
    error: string
    id: string
    inFlight: boolean
};

export type Client = {
    bsID: string
    debt: boolean
    email: string
    expiration: string
    id: string
    name: string
    photo: string
};

export type ScanState = {
    inFlight: boolean
    scans: Map<string, Scan>
};

export type Register = {
    done: boolean
    error: string
    inFlight: boolean
};

export const expired = (s: Scan): boolean => (Date.parse(s.client.expiration) - Date.parse(s.time) < 0);

const initialState: ScanState = {scans: new Map<string, Scan>(), inFlight: false};

export const scan = (state: ScanState = initialState, action: Action): ScanState => {
    switch (action.type) {
        case ActionType.ScanClient:
            const s: Scan = {
                client: (action as ScanClientAction).client,
                error: '',
                time: Date(),
            };
            return {
                ...state,
                scans: state.scans.set(s.client.bsID, s),
            };
        case ActionType.ScanError:
            const e: Scan = {
                client: {} as Client,
                error: (action as ScanErrorAction).error,
                time: Date(),
            };
            return {
                ...state,
                scans: state.scans.set('error', e),
            };

        case ActionType.ScanInFlight:
            return {...state, inFlight: (action as ScanInFlightAction).inFlight};
    }
    return state;
};

const initialManualScan: ManualScan = {error: '', id: '', inFlight: false};

export const manualScan = (state: ManualScan = initialManualScan, action: Action): ManualScan => {
    switch (action.type) {
        case ActionType.SetManualScan:
            return {
                error: (action as SetManualScanAction).error,
                id: (action as SetManualScanAction).id,
                inFlight: (action as SetManualScanAction).inFlight,
            };
    }
    return state;
};

const initialRegister: Register = {done: false, error: '', inFlight: false};

export const register = (state: Register = initialRegister, action: Action): Register => {
    switch (action.type) {
        case ActionType.SetRegister:
            return {
                done: (action as SetRegisterAction).done,
                error: (action as SetRegisterAction).error,
                inFlight: (action as SetRegisterAction).inFlight,
            };
    }
    return state;
};
