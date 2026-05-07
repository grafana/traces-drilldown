import React from 'react';

type InlineSvgProps = React.HTMLAttributes<HTMLSpanElement> & {
  src?: string;
  innerRef?: React.Ref<HTMLSpanElement>;
};

export default function InlineSVG({ innerRef, children, ...rest }: InlineSvgProps) {
  return (
    <span ref={innerRef} data-testid="mocked-svg" {...rest}>
      {children}
    </span>
  );
}
