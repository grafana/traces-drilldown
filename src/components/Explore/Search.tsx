import { Field, Input, Icon, useStyles2 } from "@grafana/ui"
import React from "react"
import { GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';
import { css } from "@emotion/css";

type Props = {
  searchQuery: string;
  onSearchQueryChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Search = (props: Props) => {
  const styles = useStyles2(getStyles);
  const { searchQuery, onSearchQueryChange } = props;

  return (
    <Field className={styles.searchField}>
      <Input
        placeholder={t('search.placeholder', 'Search')}
        prefix={<Icon name={'search'} />}
        value={searchQuery}
        onChange={onSearchQueryChange}
        id='searchFieldInput'
      />
    </Field>
  )
}

function getStyles(theme: GrafanaTheme2) {
  return {
    searchField: css({
      marginBottom: theme.spacing(1),
    }),
  };
}
