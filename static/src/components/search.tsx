import * as React from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import * as redux from 'redux';

import { requestClient, scanSearch } from '../actions';
import { All } from '../reducers';

type scanSearchProps = {
    dispatch: redux.Dispatch<All>
    search: string
};

const mapSearchToProps = (state: All, {}): {search: string} => ({search: state.scan.search});

const mapDispatchToProps = (dispatch: redux.Dispatch<All>): {dispatch: redux.Dispatch<All>} => ({
    dispatch,
});

const SearchIcon: React.SFC<React.HTMLAttributes<HTMLDivElement>> =
(props: React.HTMLAttributes<HTMLDivElement>): JSX.Element => (
    <div {...props} className="search-icon">
        <div className="search-icon--circle"/>
        <div className="search-icon--rectangle"/>
    </div>
);

const search: React.SFC<scanSearchProps> = ({dispatch, search: s}: scanSearchProps): JSX.Element => {
    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        const id: string = e.target.value;
        if (id === s) {
            return;
        }
        if (id === '') {
            dispatch(scanSearch(id));
            dispatch(push('/'));
            return;
        }
        dispatch(scanSearch(id));
        dispatch(requestClient(id));
        dispatch(push(`/scan/${id}`));
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
