import Action, { ActionType, SetSheetAction, SheetsAction } from '../actions';

export type Sheet = {
    id: string
    name: string
};

export type SetSheet = {
    id: string
    inFlight: boolean
};

const initialState: Sheet[] = [];

export const sheets = (state: Sheet[] = initialState, action: Action): Sheet[] => {
    switch (action.type) {
        case ActionType.AddSheets:
        return new Array<Sheet>().concat(state, (action as SheetsAction).sheets);
    }
    return state;
};

export const setSheet = (state: SetSheet = {} as SetSheet, action: Action): SetSheet => {
    switch (action.type) {
        case ActionType.SetSheet:
        return {
            id: (action as SetSheetAction).id,
            inFlight: (action as SetSheetAction).inFlight,
        };
    }
    return state;
};
