import styled from 'styled-components/macro';
import tw from 'twin.macro';

export default styled.div<{ $hoverable?: boolean }>`
    ${tw`flex rounded-lg no-underline text-neutral-200 items-center bg-neutral-700 p-4 border border-neutral-600 transition-colors duration-150 overflow-hidden`};

    ${(props) => props.$hoverable !== false && tw`hover:border-neutral-400 hover:bg-neutral-600`};

    & .icon {
        ${tw`rounded-lg w-16 flex items-center justify-center bg-neutral-600 p-3`};
    }
`;
