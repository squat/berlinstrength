import Action, { ActionType, SetUserAction } from '../actions';
import { All } from './index';

export type User = {
    email: string
};

const initialState: User = {
    email: '',
};

export const user = (state: User = initialState, action: Action): User => {
    switch (action.type) {
        case ActionType.SetUser:
        return {
            email: (action as SetUserAction).email,
        };
    }
    return state;
};

export const isAuthenticated = (state: All): boolean => {
    return state.user.email !== '';
};
