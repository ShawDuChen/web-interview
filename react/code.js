{
  const state = {
    data: [
      { id: 1, name: "A" },
      {
        id: 2,
        name: "B",
      },
    ],
  };

  const { data } = state;

  const temp = data.filter(item => item.id !== 0);
  temp.map((item) => item.name="C")
  console.log(temp, data, state.data);
}


{
  
  const state = {
    data: [
      { id: 1, name: "A" },
      {
        id: 2,
        name: "B",
      },
    ],
  };

  const { data } = state;

  const temp = data.concat([])
  temp.map((item) => item.name="C")
  console.log(temp, data, state.data);
}



{
  const state = {
    data: [
      { id: 1, name: "A" },
      {
        id: 2,
        name: "B",
      },
    ],
  };

  const { data } = state;

  const temp = [].slice.call(data);
  temp.map((item) => item.name="C")
  console.log(temp, data, state.data);
}
