import Action, {
    ActionType,
    ScanClientAction,
    ScanErrorAction,
    ScanInFlightAction,
    ScanSearchAction,
    ScanSeenAction,
    SetManualScanAction,
} from '../actions';

const generateUUID = (): string => {
    let d = new Date().getTime();
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        d += performance.now();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c: string): string => {
        // tslint:disable-next-line:no-bitwise
        const r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        // tslint:disable-next-line:no-bitwise
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
};

export type Scan = {
    error: string
    id: string
    seen: boolean
    time: string
    uuid: string
};

export type ManualScan = {
    error: string
    id: string
    inFlight: boolean
};

export type ScanState = {
    inFlight: boolean
    scans: Scan[]
    search: string
};

const initialState: ScanState = {inFlight: false, scans: [], search: ''};

export const scan = (state: ScanState = initialState, action: Action): ScanState => {
    switch (action.type) {
        case ActionType.ScanClient:
            const s: Scan = {
                error: '',
                id: (action as ScanClientAction).id,
                seen: false,
                time: Date(),
                uuid: generateUUID(),
            };
            return {
                ...state,
                scans: [s].concat(state.scans),
            };
        case ActionType.ScanError:
            const e: Scan = {
                error: (action as ScanErrorAction).error,
                id: '',
                seen: false,
                time: Date(),
                uuid: generateUUID(),
            };
            return {
                ...state,
                scans: [e].concat(state.scans),
            };
        case ActionType.ScanSeen:
            const i = state.scans.findIndex((sc: Scan): boolean => sc.uuid === (action as ScanSeenAction).uuid);
            if (i === -1) {
                return state;
            }
            const seen = {...state.scans[i], seen: (action as ScanSeenAction).seen};
            const scans = state.scans.splice(0);
            scans[i] = seen;
            return {
                ...state,
                scans,
            };
        case ActionType.ScanInFlight:
            return {...state, inFlight: (action as ScanInFlightAction).inFlight};
        case ActionType.ScanSearch:
            return {...state, search: (action as ScanSearchAction).search};
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
