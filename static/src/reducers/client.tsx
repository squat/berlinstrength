import Action, {
    ActionType,
    SetClientAction,
    SetRegisterAction,
    SetUploadAction,
} from '../actions';

export type Client = {
    bsID: string
    debt: boolean
    email: string
    expiration: string
    id: string
    name: string
    photo: string
};

export type NetworkClient = {
    client: Client
    error: string
    inFlight: boolean
};

export type ClientState = Map<string, NetworkClient>;

export type Register = {
    done: boolean
    error: string
    inFlight: boolean
};

export type Upload = {
    error: string
    fileID: string
    inFlight: boolean
};

export const expired = (c: Client): boolean => (Date.parse(c.expiration) - Date.now() < 0);

export const clientOK = (c: NetworkClient): boolean => c.error === '' && !expired(c.client) && !c.client.debt;

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

const initialUpload: Upload = {error: '', fileID: '', inFlight: false};

export const upload = (state: Upload = initialUpload, action: Action): Upload => {
    switch (action.type) {
        case ActionType.SetUpload:
            return {
                error: (action as SetUploadAction).error,
                fileID: (action as SetUploadAction).fileID,
                inFlight: (action as SetUploadAction).inFlight,
            };
    }
    return state;
};

const initialClientState: ClientState = new Map<string, NetworkClient>();

export const clients = (state: ClientState = initialClientState, action: Action): ClientState => {
    switch (action.type) {
        case ActionType.SetClient:
            const c: NetworkClient = {
                client: (action as SetClientAction).client,
                error: (action as SetClientAction).error,
                inFlight: (action as SetClientAction).inFlight,
            };
            return new Map(state).set((action as SetClientAction).id, c);
    }
    return state;
};
