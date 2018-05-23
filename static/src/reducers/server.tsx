import Action, { ActionType, SetWebSocketAction } from '../actions';

export type Server = {
    webSocket: boolean
};

const initialState: Server = {
    webSocket: false,
};

export const server = (state: Server = initialState, action: Action): Server => {
    switch (action.type) {
        case ActionType.SetWebSocket:
        return {
            ...state,
            webSocket: (action as SetWebSocketAction).state,
        };
    }
    return state;
};
