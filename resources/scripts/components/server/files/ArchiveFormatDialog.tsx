import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faFileArchive, faBoxOpen } from '@fortawesome/free-solid-svg-icons';
import { Dialog, DialogProps } from '@/components/elements/dialog';
import { Button } from '@/components/elements/button/index';
import { ArchiveFormat } from '@/api/server/files/compressFiles';

interface Option {
    value: ArchiveFormat;
    label: string;
    extension: string;
    description: string;
    icon: IconDefinition;
}

// Ordered deliberately: zip first, since it opens natively on Windows and macOS
// without extra tooling and is what most people actually want.
const options: Option[] = [
    {
        value: 'zip',
        label: 'ZIP',
        extension: '.zip',
        description: 'Opens anywhere without extra software. Best for downloading and sharing.',
        icon: faFileArchive,
    },
    {
        value: 'tar_gz',
        label: 'Gzipped Tarball',
        extension: '.tar.gz',
        description: 'Preserves Unix permissions and compresses smaller. Best for server-side backups.',
        icon: faBoxOpen,
    },
];

type Props = DialogProps & {
    // Purely informational; drives the sentence describing what will be archived.
    count: number;
    onSelected: (format: ArchiveFormat) => void;
};

const ArchiveFormatDialog = ({ count, onSelected, ...props }: Props) => {
    const [selected, setSelected] = useState<ArchiveFormat>('zip');

    return (
        <Dialog
            {...props}
            title={'Create Archive'}
            description={`Choose a format for the archive of ${count} ${count === 1 ? 'item' : 'items'}.`}
        >
            {/* Dialog.Description has no bottom margin of its own, so without
                this the sentence sits right on top of the ZIP option. */}
            <div className={'mt-5 space-y-2'}>
                {options.map((option) => {
                    const active = selected === option.value;

                    return (
                        <button
                            key={option.value}
                            type={'button'}
                            onClick={() => setSelected(option.value)}
                            aria-pressed={active}
                            className={
                                'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors duration-150 ' +
                                (active
                                    ? 'border-lumi-500 bg-lumi-500/10'
                                    : 'border-neutral-600 hover:border-neutral-500')
                            }
                        >
                            <FontAwesomeIcon
                                icon={option.icon}
                                className={`mt-0.5 ${active ? 'text-lumi-400' : 'text-neutral-500'}`}
                                fixedWidth
                            />
                            <span className={'min-w-0 flex-1'}>
                                <span className={'flex items-baseline gap-2'}>
                                    <span className={'text-sm font-medium text-neutral-100'}>{option.label}</span>
                                    <code className={'text-xs text-neutral-500'}>{option.extension}</code>
                                </span>
                                <span className={'mt-0.5 block text-xs text-neutral-400'}>{option.description}</span>
                            </span>
                        </button>
                    );
                })}
            </div>
            <Dialog.Footer>
                <Button.Text onClick={props.onClose}>Cancel</Button.Text>
                <Button onClick={() => onSelected(selected)}>Create Archive</Button>
            </Dialog.Footer>
        </Dialog>
    );
};

export default ArchiveFormatDialog;
