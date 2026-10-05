const formatWithCommas = (value) => {
  // if (value === null || value === undefined || value === "") return "";

  const num = Number(value);
  if (isNaN(num)) return "";

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export default formatWithCommas;

