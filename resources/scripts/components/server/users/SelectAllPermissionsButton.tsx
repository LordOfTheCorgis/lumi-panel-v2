import React, { useCallback } from 'react';
import { useField } from 'formik';
import Button from '@/components/elements/Button';

interface Props {
    permissions: string[];
    className?: string;
}

const SelectAllPermissionsButton = ({ permissions, className }: Props) => {
    const [{ value }, , { setValue }] = useField<string[]>('permissions');

    const allSelected = permissions.length > 0 && permissions.every((p) => value.includes(p));

    const onClick = useCallback(() => {
        if (allSelected) {
            setValue(value.filter((p) => !permissions.includes(p)));
        } else {
            setValue([...value, ...permissions.filter((p) => !value.includes(p))]);
        }
    }, [allSelected, permissions, value]);

    return (
        <Button type={'button'} isSecondary size={'small'} className={className} onClick={onClick}>
            {allSelected ? 'Deselect All' : 'Select All'}
        </Button>
    );
};

export default SelectAllPermissionsButton;
