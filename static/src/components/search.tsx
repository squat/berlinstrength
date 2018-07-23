import * as React from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import * as redux from 'redux';

import { requestClient, scanSearch } from '../actions';
import { All } from '../reducers';

type scanSearchProps = {
    search: string
};

type Actions = {
    push: typeof push
    requestClient: typeof requestClient
    scanSearch: typeof scanSearch
};

type Dispatch = {
    actions: Actions
};

const mapSearchToProps = (state: All, {}): {search: string} => ({search: state.scan.search});

const mapDispatchToProps = (dispatch: redux.Dispatch<redux.AnyAction>): Dispatch => (
    {actions: redux.bindActionCreators({push, requestClient, scanSearch}, dispatch)}
);

const SearchIcon: React.SFC<React.HTMLAttributes<HTMLDivElement>> =
(props: React.HTMLAttributes<HTMLDivElement>): JSX.Element => (
    <div {...props} className="search-icon">
        <div className="search-icon--circle"/>
        <div className="search-icon--rectangle"/>
    </div>
);

const search: React.SFC<scanSearchProps&Dispatch> = ({search: s, ...props}: scanSearchProps&Dispatch): JSX.Element => {
    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        const id: string = e.target.value.toLowerCase();
        if (id === s) {
            return;
        }
        if (id === '') {
            props.actions.scanSearch(id);
            props.actions.push('/');
            return;
        }
        props.actions.scanSearch(id);
        props.actions.requestClient(id);
        props.actions.push(`/scan/${id}`);
    };
    return (
        <div className="search">
            <SearchIcon style={{fontSize: '.4em'}}/>
            <input
                className="search-input"
                value={s}
                onChange={onChange}
            />
        </div>
    );
};

export const Search = connect(mapSearchToProps, mapDispatchToProps)(search);
