export const TokenList = ({
  name,
  symbol,
  index,
  handleClick,
}: {
  name?: string;
  symbol?: string;
  index?: number;
  handleClick?: any;
}) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        marginLeft: "16px",
        // marginTop: "16px",
      }}
      data-custom-id={index}
      onClick={e => {
        const ind = e.currentTarget.getAttribute("data-custom-id");
        handleClick(ind);
      }}
    >
      <p
        style={{
          fontWeight: 500,
          fontSize: "16px",
          cursor: "pointer",
          marginBottom: 0,
          fontFamily: "'Inter custom',sans-serif",
        }}
      >
        {name?.toUpperCase()}
      </p>
      <p
        style={{
          color: "rgb(93, 103, 133)",
          cursor: "pointer",
          direction: "ltr",
          fontSize: "12px",
          fontWeight: 300,
          marginTop: 0,
          marginBottom: 0,
          fontFamily: "'Inter custom',sans-serif",
        }}
      >
        {symbol}
      </p>
    </div>
  );
};
